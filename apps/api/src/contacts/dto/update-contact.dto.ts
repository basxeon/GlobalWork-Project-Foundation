import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CreateContactDto } from './create-contact.dto';

export class UpdateContactDto extends PartialType(CreateContactDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  title?: string;
  @ApiPropertyOptional({ description: 'Reuses existing given_names.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  givenNames?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleName?: string;
  @ApiPropertyOptional({ description: 'Reuses existing surname.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  surname?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nationality?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(16) sex?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  passportNumber?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dateOfIssue?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dateOfExpiry?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  issuingCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressInThailand?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySalary?: number;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  employmentStartDate?: string;
}
