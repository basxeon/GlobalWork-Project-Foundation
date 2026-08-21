import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  it('reports an available writable Local Drive and document count', async () => {
    const settings = { find: jest.fn() };
    const documents = { countBy: jest.fn().mockResolvedValue(4) };
    const dataSource = { query: jest.fn() };
    const storage = {
      upload: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SettingsService(
      settings as never,
      documents as never,
      dataSource as never,
      storage as never,
    );
    await expect(service.storageStatus()).resolves.toEqual(
      expect.objectContaining({
        provider: 'Local Drive',
        status: 'AVAILABLE',
        writable: true,
        documentCount: 4,
      }),
    );
    expect(storage.delete).toHaveBeenCalled();
  });

  it('reports unavailable when the writable test fails', async () => {
    const service = new SettingsService(
      { find: jest.fn() } as never,
      { countBy: jest.fn().mockResolvedValue(0) } as never,
      { query: jest.fn() } as never,
      {
        upload: jest.fn().mockRejectedValue(new Error('unavailable')),
        exists: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
      } as never,
    );
    await expect(service.storageStatus()).resolves.toEqual(
      expect.objectContaining({ status: 'UNAVAILABLE', writable: false }),
    );
  });
});
