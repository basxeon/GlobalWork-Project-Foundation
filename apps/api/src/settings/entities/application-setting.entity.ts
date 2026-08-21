import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'application_settings' })
export class ApplicationSetting {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'application_name', type: 'varchar', length: 120 })
  applicationName: string;
  @Column({
    name: 'company_display_name',
    type: 'varchar',
    length: 160,
    nullable: true,
  })
  companyDisplayName: string | null;
  @Column({ name: 'time_zone', type: 'varchar', length: 64 }) timeZone: string;
  @Column({ name: 'date_format', type: 'varchar', length: 24 })
  dateFormat: string;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
