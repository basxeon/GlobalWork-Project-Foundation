import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Active users row to assign the task to.',
    example: '9b2c3d4e-5f60-4a1b-8c2d-3e4f5a6b7c8d',
  })
  @IsUUID()
  assigneeId: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Active users row performing the assignment.',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsUUID()
  assignedById: string;
}
