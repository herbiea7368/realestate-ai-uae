import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { PermitCheckDto } from './dto/permit-check.dto';
import { PermitStatusQueryDto } from './dto/permit-status-query.dto';
import { PermitService } from './permit.service';
import { PermitValidationResult } from './permit.types';

@Controller({
  path: 'permits',
  version: '1',
})
export class PermitController {
  constructor(private readonly permitService: PermitService) {}

  @Post('check')
  checkPermit(
    @Body() payload: PermitCheckDto,
  ): Promise<PermitValidationResult> {
    return this.permitService.checkPermit(payload);
  }

  @Get('status')
  getPermitStatus(
    @Query() query: PermitStatusQueryDto,
  ): Promise<PermitValidationResult> {
    return this.permitService.getStatus(query.trakheesi);
  }
}
