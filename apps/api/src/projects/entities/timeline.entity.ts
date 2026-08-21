import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'timeline' })
export class TimelineEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'case_id', type: 'uuid' }) caseId: string;
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true }) createdBy:
    string | null;
  @Column({ name: 'event_type' }) eventType: string;
  @Column({ name: 'entity_type' }) entityType: string;
  @Column({ name: 'entity_id', type: 'uuid', nullable: true }) entityId:
    string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) title:
    string | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'jsonb', default: {} }) metadata: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
