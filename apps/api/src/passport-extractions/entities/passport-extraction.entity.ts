import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'passport_extractions' })
export class PassportExtraction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'document_id', type: 'uuid' }) documentId: string;
  @Column({ type: 'varchar', length: 32 }) status: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) surname:
    string | null;
  @Column({ name: 'given_names', type: 'varchar', length: 255, nullable: true })
  givenNames: string | null;
  @Column({
    name: 'passport_number',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  passportNumber: string | null;
  @Column({ type: 'varchar', length: 128, nullable: true }) nationality:
    string | null;
  @Column({ name: 'date_of_birth', type: 'date', nullable: true }) dateOfBirth:
    string | null;
  @Column({ type: 'varchar', length: 16, nullable: true }) sex: string | null;
  @Column({ name: 'date_of_issue', type: 'date', nullable: true }) dateOfIssue:
    string | null;
  @Column({ name: 'date_of_expiry', type: 'date', nullable: true })
  dateOfExpiry: string | null;
  @Column({
    name: 'issuing_country',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  issuingCountry: string | null;
  @Column({ name: 'raw_text', type: 'text', nullable: true }) rawText:
    string | null;
  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  confidence: string | null;
  @Column({
    name: 'error_message',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  errorMessage: string | null;
  @Column({ name: 'extracted_at', type: 'timestamptz', nullable: true })
  extractedAt: Date | null;
  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;
  @Column({ name: 'confirmed_by', type: 'uuid', nullable: true }) confirmedBy:
    string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
