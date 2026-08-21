import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'contacts' })
export class Contact {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) email:
    string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) phone: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
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
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;
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
  @Column({ type: 'varchar', length: 64, nullable: true }) title: string | null;
  @Column({ name: 'middle_name', type: 'varchar', length: 255, nullable: true })
  middleName: string | null;
  @Column({ name: 'address_in_thailand', type: 'text', nullable: true })
  addressInThailand: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) position:
    string | null;
  @Column({
    name: 'monthly_salary',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  monthlySalary: string | null;
  @Column({ name: 'employment_start_date', type: 'date', nullable: true })
  employmentStartDate: string | null;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
  @Column({ name: 'deleted_by', type: 'uuid', nullable: true }) deletedBy:
    string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
