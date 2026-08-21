import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateChecklistItemDto {
  @ApiProperty({ maxLength: 255, example: 'Verify passport expiry date' })
  @IsString()
  @MaxLength(255)
  label: string;
}
