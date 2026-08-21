import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export class CreateTaskDto {
  @ApiProperty({ maxLength: 255, example: 'Collect passport copy' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: PRIORITIES, default: 'MEDIUM' })
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: (typeof PRIORITIES)[number];

  @ApiProperty({
    format: 'uuid',
    description: 'Active users row creating the task.',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsUUID()
  createdById: string;
}
