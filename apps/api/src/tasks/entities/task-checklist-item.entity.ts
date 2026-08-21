import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'task_checklist_items' })
export class TaskChecklistItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'task_id', type: 'uuid' }) taskId: string;
  @Column({ type: 'varchar', length: 255 }) label: string;
  @Column({ type: 'boolean', default: false }) completed: boolean;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
