import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdatePassportExtractionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() surname?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() givenNames?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() passportNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sex?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfIssue?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateOfExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issuingCountry?: string;
  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}
