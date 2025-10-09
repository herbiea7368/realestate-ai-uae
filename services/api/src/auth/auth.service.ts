import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly jwt = new JwtService({
    secret: process.env.AUTH_JWT_SECRET ?? 'stub-secret',
    signOptions: { expiresIn: '1h' }
  });

  async signPayload(payload: { sub: string; roles: string[] }) {
    return this.jwt.signAsync(payload);
  }

  async validateToken(token: string) {
    return this.jwt.verifyAsync(token, {
      secret: process.env.AUTH_JWT_SECRET ?? 'stub-secret'
    });
  }
}
