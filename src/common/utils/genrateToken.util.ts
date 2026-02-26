import { JwtService } from '@nestjs/jwt';
import { LoginResponseDto } from "src/auth/presentation/dto/login-response.dto";
import { User } from "src/users/domain/user.entity";

function buildPayload(user: User) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        approved: user.approved,
    };
}

export async function generateTokens(
    user: User,
    jwtService: JwtService,
): Promise<LoginResponseDto> {


    const accessToken = await generateAccessToken(user, jwtService);
    const refreshToken = await generateRefreshToken(user, jwtService);

    return { accessToken, refreshToken };
}

export function generateAccessToken(
    user: User,
    jwtService: JwtService,
): Promise<string> {    
    const payload = buildPayload(user);

    return jwtService.signAsync(payload, { expiresIn: '15m' });
}

export function generateRefreshToken(
    user: User,
    jwtService: JwtService,
): Promise<string> {
    
    const payload = buildPayload(user);
    return jwtService.signAsync(payload, { expiresIn: '7d' });
}