import { IsEnum, Matches, MinLength, IsString } from 'class-validator';

export enum Market {
  Dubai = 'Dubai'
}

export class PermitCheckDto {
  @IsString()
  @MinLength(1)
  propertyId!: string;

  @IsEnum(Market)
  market!: Market;

  @Matches(/^[0-9]{6}$/)
  trakheesiNumber!: string;
}
