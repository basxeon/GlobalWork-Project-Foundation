import { Injectable } from '@nestjs/common';
import { LocalDriveProvider } from './providers/local-drive.provider';
import { StorageMetadata } from './storage.types';

@Injectable()
export class StorageService {
  constructor(private readonly driver: LocalDriveProvider) {}

  upload(key: string, content: Buffer): Promise<void> {
    return this.driver.upload(key, content);
  }

  download(key: string): Promise<Buffer> {
    return this.driver.download(key);
  }

  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  move(fromKey: string, toKey: string): Promise<void> {
    return this.driver.move(fromKey, toKey);
  }

  copy(fromKey: string, toKey: string): Promise<void> {
    return this.driver.copy(fromKey, toKey);
  }

  exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }

  createDirectory(key: string): Promise<void> {
    return this.driver.createDirectory(key);
  }

  getMetadata(key: string): Promise<StorageMetadata> {
    return this.driver.getMetadata(key);
  }
}
