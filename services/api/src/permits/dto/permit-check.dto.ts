import { Expose } from 'class-transformer';
import { IsEnum, Matches, MinLength, IsString } from 'class-validator';

export enum Market {
  Dubai = 'Dubai'
}

export class PermitCheckDto {
  @Expose({ name: 'property_id' })
  @IsString()
  @MinLength(1)
  propertyId!: string;

  @IsEnum(Market)
  market!: Market;

  @Expose({ name: 'trakheesi_number' })
  @Matches(/^[0-9]{6}$/)
  trakheesiNumber!: string;
}
