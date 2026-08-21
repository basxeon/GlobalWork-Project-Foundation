import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RemoveTaskDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'Active users row performing the soft delete; recorded as tasks.deleted_by.',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsUUID()
  deletedById: string;
}
