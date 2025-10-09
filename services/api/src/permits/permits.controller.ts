import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { PermitCheckDto } from './dto/permit-check.dto';
import { PermitStatusQueryDto } from './dto/permit-status-query.dto';
import { PermitsService } from './permits.service';

@Controller({ path: 'permits', version: '1' })
export class PermitsController {
  constructor(private readonly permitsService: PermitsService) {}

  @Post('check')
  check(@Body() payload: PermitCheckDto) {
    return this.permitsService.check(payload);
  }

  @Get('status')
  status(@Query() query: PermitStatusQueryDto) {
    return this.permitsService.status(query.trakheesi);
  }
}
