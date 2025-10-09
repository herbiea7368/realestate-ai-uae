import { Expose } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export enum ListingLanguage {
  En = 'en',
  Ar = 'ar'
}

export class ListingWriterRequestDto {
  @Expose({ name: 'property_id' })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @IsString()
  @IsNotEmpty()
  market!: string;

  @Expose({ name: 'trakheesi_number' })
  @Matches(/^[0-9]{6}$/)
  trakheesiNumber!: string;

  @IsEnum(ListingLanguage)
  language!: ListingLanguage;

  @IsOptional()
  @IsString()
  community?: string;
}
