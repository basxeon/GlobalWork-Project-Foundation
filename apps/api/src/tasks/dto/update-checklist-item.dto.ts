import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateChecklistItemDto {
  @ApiPropertyOptional({ example: true })
  @ApiPropertyOptional({ example: 'Verify passport expiry date' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;
}
