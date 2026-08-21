import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const DOCUMENT_CATEGORIES = [
  'PASSPORT',
  'VISA',
  'WORK_PERMIT',
  'PHOTO',
  'CONTRACT',
  'COMPANY_DOCUMENT',
  'TM30',
  'OTHER',
] as const;

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'John Smith passport' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_CATEGORIES })
  @IsOptional()
  @IsIn(DOCUMENT_CATEGORIES)
  category?: string;
}
