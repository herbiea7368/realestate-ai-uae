import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'permit-service',
      version: 'v1',
      region: 'me-central-1',
    };
  }
}
