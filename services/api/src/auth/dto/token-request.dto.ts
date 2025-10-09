import { IsNotEmpty, IsString } from 'class-validator';

export class TokenRequestDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  clientSecret!: string;
}
