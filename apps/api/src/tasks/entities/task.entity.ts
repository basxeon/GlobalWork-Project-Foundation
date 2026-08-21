import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'case_id', type: 'uuid' }) caseId: string;
  @Column({ type: 'varchar', length: 255 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true }) assigneeId:
    string | null;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate:
    string | null;
  @Column({ type: 'varchar', length: 16, default: 'MEDIUM' }) priority: string;
  @Column({ type: 'varchar', length: 16, default: 'OPEN' }) status: string;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
  @Column({ name: 'created_by_id', type: 'uuid' }) createdById: string;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
  @Column({ name: 'deleted_by', type: 'uuid', nullable: true }) deletedBy:
    string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
