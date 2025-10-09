import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Get()
  heartbeat() {
    return {
      status: 'ok',
      service: 'api',
      region: 'me-central-1'
    };
  }
}
