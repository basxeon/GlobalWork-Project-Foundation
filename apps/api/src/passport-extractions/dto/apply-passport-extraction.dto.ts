import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ApplyPassportExtractionDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Required after the API reports Contact field conflicts.',
  })
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
