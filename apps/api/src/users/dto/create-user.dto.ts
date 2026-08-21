import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const ROLES = ['ADMIN', 'STAFF'] as const;

export class CreateUserDto {
  @ApiProperty({ example: 'Nina Smith' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'nina@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ enum: ROLES, example: 'STAFF' })
  @IsIn(ROLES)
  role: (typeof ROLES)[number];

  @ApiProperty({ minLength: 8, example: 'Temporary2026!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
