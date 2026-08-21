import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@homebase.local' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Homebase2026!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
