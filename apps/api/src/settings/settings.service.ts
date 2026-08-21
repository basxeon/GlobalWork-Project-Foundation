import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Document } from '../documents/entities/document.entity';
import { StorageService } from '../storage/storage.service';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';
import { ApplicationSetting } from './entities/application-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ApplicationSetting)
    private readonly settings: Repository<ApplicationSetting>,
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async getGeneral() {
    return (
      await this.settings.find({ order: { updatedAt: 'DESC' }, take: 1 })
    )[0];
  }

  async updateGeneral(dto: UpdateGeneralSettingsDto) {
    const current = await this.getGeneral();
    return this.settings.save({
      ...current,
      applicationName: dto.applicationName,
      companyDisplayName: dto.companyDisplayName || null,
      timeZone: dto.timeZone,
      dateFormat: dto.dateFormat,
    });
  }

  async storageStatus() {
    const probeKey = `.health/storage-${Date.now()}`;
    let writable = false;
    try {
      await this.storage.upload(probeKey, Buffer.from('ok'));
      writable = await this.storage.exists(probeKey);
    } catch {
      writable = false;
    } finally {
      await this.storage.delete(probeKey).catch(() => undefined);
    }
    return {
      provider: 'Local Drive',
      status: writable ? 'AVAILABLE' : 'UNAVAILABLE',
      writable,
      documentCount: await this.documents.countBy({ deletedAt: IsNull() }),
      storageRoot: process.env.STORAGE_LOCAL_ROOT ?? 'storage-data',
    };
  }

  async systemInfo() {
    let databaseHealth = 'UNAVAILABLE';
    try {
      await this.dataSource.query('SELECT 1');
      databaseHealth = 'AVAILABLE';
    } catch {
      databaseHealth = 'UNAVAILABLE';
    }
    const storage = await this.storageStatus();
    return {
      apiVersion: '0.0.1',
      databaseHealth,
      storageHealth: storage.status,
      environment: process.env.NODE_ENV ?? 'development',
      healthEndpoint: '/api/health',
      swaggerEndpoint: '/api/docs',
    };
  }
}
