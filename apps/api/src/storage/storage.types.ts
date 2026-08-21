export interface StorageMetadata {
  sizeBytes: number;
  modifiedAt: Date;
}

export interface StorageDriver {
  upload(key: string, content: Buffer): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  move(fromKey: string, toKey: string): Promise<void>;
  copy(fromKey: string, toKey: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  createDirectory(key: string): Promise<void>;
  getMetadata(key: string): Promise<StorageMetadata>;
}
