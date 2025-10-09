import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { TokenRequestDto } from './dto/token-request.dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  async createToken(@Body() dto: TokenRequestDto) {
    const token = await this.authService.signPayload({
      sub: dto.clientId,
      roles: ['agent']
    });

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600
    };
  }

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    if (!authorization) {
      return { authenticated: false };
    }
    const token = authorization.replace(/^Bearer\s+/i, '');
    const payload = await this.authService.validateToken(token).catch(() => null);
    return {
      authenticated: Boolean(payload),
      payload
    };
  }
}
