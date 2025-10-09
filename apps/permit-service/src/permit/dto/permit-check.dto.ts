import { IsDefined, IsEnum, Matches, MinLength } from 'class-validator';

enum Market {
  Dubai = 'Dubai',
}

export class PermitCheckDto {
  @IsDefined()
  @MinLength(1)
  property_id!: string;

  @IsEnum(Market)
  market!: Market;

  @Matches(/^[0-9]{6}$/)
  trakheesi_number!: string;
}
