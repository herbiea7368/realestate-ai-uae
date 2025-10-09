import { Matches } from 'class-validator';

export class PermitStatusQueryDto {
  @Matches(/^[0-9]{6}$/)
  trakheesi!: string;
}
