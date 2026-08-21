import { Module } from '@nestjs/common';
import { LocalDriveProvider } from './providers/local-drive.provider';
import { StorageService } from './storage.service';

@Module({
  providers: [LocalDriveProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
