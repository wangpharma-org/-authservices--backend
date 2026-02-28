import {
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { User } from '../domain/user.entity';
import { Role } from '../../roles/domain/role.entity';
import { CreateUserDto } from '../presentation/dto/create-user.dto';
import { UpdateUserDto } from '../presentation/dto/update-user.dto';
import { FindUsersQueryDto } from '../presentation/dto/find-users-query.dto';
import { buildCombinedSearchOptions } from '../../common/utils/search.util';
import {
  buildPaginationMeta,
  buildPaginationOptions,
  PaginationMeta,
} from '../../common/utils/pagination.util';
import { USERS_REPOSITORY } from '../domain/ports/users.repository.interface';
import type { IUsersRepository } from '../domain/ports/users.repository.interface';
import { HashService } from '../../common/services/hash.service';
import { RolesService } from '../../roles/application/roles.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly hashService: HashService,
    private readonly rolesService: RolesService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    let password: string | undefined = undefined;

    if (createUserDto.password) {
      password = await this.hashService.hash(createUserDto.password);
    }

    let email: string | undefined = undefined;

    if (createUserDto.email) {
      const existing = await this.usersRepository.findOneByEmail(
        createUserDto.email,
      );
      if (existing) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { email: 'emailAlreadyExists' },
        });
      }

      email = createUserDto.email;
    }

    const { roleIds, ...userFields } = createUserDto;
    const roles = roleIds?.length ? await this.resolveRoles(roleIds) : [];

    const user = this.usersRepository.create({
      ...userFields,
      password,
      email,
      roles,
    });

    return this.usersRepository.save(user);
  }

  async me(userId: string): Promise<User | null> {
    return this.usersRepository.me(userId);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOneByIdWithRoles(id);
    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: { userId: 'userNotFound' },
      });
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findOneByEmail(dto.email);
      if (existing) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: { email: 'emailAlreadyExists' },
        });
      }
      user.email = dto.email;
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    if (dto.roleIds !== undefined) {
      user.roles = await this.resolveRoles(dto.roleIds);
    }

    return this.usersRepository.save(user);
  }

  async findByEmail(email: User['email']): Promise<User | null> {
    return this.usersRepository.findOneByEmail(email);
  }

  async findById(id: User['id']): Promise<User | null> {
    return this.usersRepository.findOneById(id);
  }

  async findByIdWithRolesAndPermissions(id: User['id']): Promise<User | null> {
    return this.usersRepository.findUserWithRolesAndPermissions(id);
  }

  async findUserAll(
    query: FindUsersQueryDto,
  ): Promise<{ data: User[]; meta: PaginationMeta }> {
    const { page, limit, search, ...filters } = query;

    const searchableFields: (keyof User)[] = ['firstName', 'lastName', 'email'];
    
    const where = buildCombinedSearchOptions<User>(
      search, 
      searchableFields, 
      filters as Record<string, unknown>
    );

    const { skip, take } = buildPaginationOptions(page, limit);

    const [data, total] = await this.usersRepository.findAndCount({
      where,
      skip,
      take,
      relations: {
        roles: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        approved: true,
        roles: {
          id: true,
          name: true,
        }, 
      }
    });
    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async addRoleToUser(userId: string, roleId: string): Promise<User> {
    const user = await this.usersRepository.findOneByIdWithRoles(userId);
    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: { userId: 'userNotFound' },
      });
    }

    const role = await this.rolesService.findById(roleId);
    if (!role) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: { roleId: 'roleNotFound' },
      });
    }

    const alreadyAssigned = user.roles.some((r) => r.id === roleId);
    if (alreadyAssigned) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        errors: { roleId: 'roleAlreadyAssigned' },
      });
    }

    user.roles = [...user.roles, role];
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.findOneById(id);
    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: { userId: 'userNotFound' },
      });
    }
    await this.usersRepository.softDelete(id);
  }

  private async resolveRoles(roleIds: string[]): Promise<Role[]> {
    const roles: Role[] = [];

    for (const roleId of roleIds) {
      const role = await this.rolesService.findById(roleId);
      if (!role) {
        throw new NotFoundException({
          status: HttpStatus.NOT_FOUND,
          errors: { roleId: 'roleNotFound' },
        });
      }
      roles.push(role);
    }

    return roles;
  }
}
