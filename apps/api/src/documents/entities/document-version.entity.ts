import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'document_versions' })
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'document_id', type: 'uuid' }) documentId: string;
  @Column({ name: 'version_number', type: 'int' }) versionNumber: number;
  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey: string;
  @Column({ name: 'size_bytes', type: 'int' }) sizeBytes: number;
  @Column({ type: 'varchar', length: 128 }) checksum: string;
  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename: string;
  @Column({ name: 'uploaded_by_id', type: 'uuid' }) uploadedById: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
