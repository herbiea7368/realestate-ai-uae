import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export enum ListingLanguage {
  En = 'en',
  Ar = 'ar'
}

export class ListingWriterRequestDto {
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @IsString()
  @IsNotEmpty()
  market!: string;

  @Matches(/^[0-9]{6}$/)
  trakheesiNumber!: string;

  @IsEnum(ListingLanguage)
  language!: ListingLanguage;

  @IsOptional()
  @IsString()
  community?: string;
}
