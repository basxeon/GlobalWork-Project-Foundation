import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'companies' })
export class Company {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({
    name: 'legal_name_th',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  legalNameTh: string | null;
  @Column({
    name: 'legal_name_en',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  legalNameEn: string | null;
  @Column({
    name: 'registration_number',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  registrationNumber: string | null;
  @Column({ name: 'tax_id', type: 'varchar', length: 64, nullable: true })
  taxId: string | null;
  @Column({ name: 'registered_address', type: 'text', nullable: true })
  registeredAddress: string | null;
  @Column({ name: 'workplace_address', type: 'text', nullable: true })
  workplaceAddress: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) phone: string | null;
  @Column({
    name: 'authorized_director',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  authorizedDirector: string | null;
  @Column({
    name: 'business_type',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  businessType: string | null;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
  @Column({ name: 'deleted_by', type: 'uuid', nullable: true }) deletedBy:
    string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
