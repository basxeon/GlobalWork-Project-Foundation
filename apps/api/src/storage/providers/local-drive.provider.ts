import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageDriver, StorageMetadata } from '../storage.types';

@Injectable()
export class LocalDriveProvider implements StorageDriver {
  private readonly root: string;

  constructor() {
    this.root = path.resolve(
      process.env.STORAGE_LOCAL_ROOT ??
        path.join(process.cwd(), 'storage-data'),
    );
  }

  private resolve(key: string): string {
    const resolved = path.resolve(this.root, key);
    if (resolved !== this.root && !resolved.startsWith(this.root + path.sep)) {
      throw new Error('STORAGE_KEY_PATH_TRAVERSAL');
    }
    return resolved;
  }

  async upload(key: string, content: Buffer): Promise<void> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  }

  download(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  async move(fromKey: string, toKey: string): Promise<void> {
    const target = this.resolve(toKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.rename(this.resolve(fromKey), target);
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    const target = this.resolve(toKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(this.resolve(fromKey), target);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(key: string): Promise<void> {
    await fs.mkdir(this.resolve(key), { recursive: true });
  }

  async getMetadata(key: string): Promise<StorageMetadata> {
    const stat = await fs.stat(this.resolve(key));
    return { sizeBytes: stat.size, modifiedAt: stat.mtime };
  }
}
