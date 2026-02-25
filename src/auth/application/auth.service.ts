import {
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthEmailLoginDto } from '../presentation/dto/auth-email-login.dto';
import { LoginResponseDto } from '../presentation/dto/login-response.dto';
import { RegisterDto } from '../presentation/dto/register.dto';
import { AUTH_REPOSITORY } from '../domain/ports/auth.repository.interface';
import type { IAuthRepository } from '../domain/ports/auth.repository.interface';
import { HashService } from '../../common/services/hash.service';
import { UsersService } from '../../users/application/users.service';
import { generateAccessToken, generateTokens } from 'src/common/utils/genrateToken.util';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepository: IAuthRepository,
    private readonly jwtService: JwtService,
    private readonly hashService: HashService,
    private readonly usersService: UsersService,
  ) {}

  async register(registerDto: RegisterDto): Promise<LoginResponseDto> {
    const user = await this.usersService.createUser(registerDto);
    
    return generateTokens(user, this.jwtService);
  }

  async validateLogin(loginDto: AuthEmailLoginDto): Promise<LoginResponseDto> {
    const user = await this.authRepository.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException({
        status: HttpStatus.UNAUTHORIZED,
        errors: 'invalid username or password',
      });
    }

    const isPasswordValid = await this.hashService.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        status: HttpStatus.UNAUTHORIZED,
        errors: 'invalid username or password',
      });
    }

    await this.authRepository.updateUserAuthFields(user.id, {
      isActive: true,
      lastLogin: new Date(),
    });

    const result = await generateTokens(user, this.jwtService);
    
    return result;
  }

  async logout(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        errors: { userId: 'User not Found' },
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        status: HttpStatus.UNAUTHORIZED,
        errors: { userId: 'notLoggedIn' },
      });
    }

    await this.authRepository.updateUserAuthFields(userId, {
      isActive: false,
    });
  }

  async refresh(token: string): Promise<{ accessToken: LoginResponseDto['accessToken'] }> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new NotFoundException({
          status: HttpStatus.NOT_FOUND,
          errors: { userId: 'User not Found' },
        });
      }


      const accessToken = await generateAccessToken(user, this.jwtService);
      
      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException({
        status: HttpStatus.UNAUTHORIZED,
        errors: 'Invalid refresh token',
      });
    }
  }
}
