import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'documents' })
export class Document {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'case_id', type: 'uuid' }) caseId: string;
  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;
  @Column({ name: 'display_name', type: 'varchar', length: 255 })
  displayName: string;
  @Column({ type: 'varchar', length: 32, default: 'OTHER' })
  category: string;
  @Column({ name: 'media_type', type: 'varchar', length: 127 })
  mediaType: string;
  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey: string;
  @Column({ name: 'current_version', type: 'int', default: 1 })
  currentVersion: number;
  @Column({ name: 'uploaded_by_id', type: 'uuid' }) uploadedById: string;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
  @Column({ name: 'deleted_by', type: 'uuid', nullable: true }) deletedBy:
    string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
