import { NotFoundException } from '@nestjs/common';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { DocumentsService } from './documents.service';
import { DocumentVersion } from './entities/document-version.entity';
import { Document } from './entities/document.entity';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let documents: { findOneBy: jest.Mock; find: jest.Mock; save: jest.Mock };
  let versions: { findOneBy: jest.Mock; find: jest.Mock };
  let dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
  let storage: {
    upload: jest.Mock;
    download: jest.Mock;
  };

  const kase = { id: 'case-1', deletedAt: null };
  const user = { id: 'user-1', active: true };
  const file = {
    originalname: 'passport.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('pdf-bytes'),
  } as Express.Multer.File;

  const managerRepos = new Map<
    unknown,
    { findOneBy: jest.Mock; save: jest.Mock }
  >();

  function repoFor(entity: unknown) {
    if (!managerRepos.has(entity)) {
      managerRepos.set(entity, { findOneBy: jest.fn(), save: jest.fn() });
    }
    return managerRepos.get(entity)!;
  }

  beforeEach(() => {
    managerRepos.clear();
    documents = { findOneBy: jest.fn(), find: jest.fn(), save: jest.fn() };
    versions = { findOneBy: jest.fn(), find: jest.fn() };
    storage = {
      upload: jest.fn().mockResolvedValue(undefined),
      download: jest.fn().mockResolvedValue(Buffer.from('content')),
    };
    dataSource = {
      transaction: jest.fn((cb: (manager: unknown) => unknown) =>
        cb({ getRepository: (entity: unknown) => repoFor(entity) }),
      ),
      getRepository: jest.fn((entity: unknown) => repoFor(entity)),
    };

    repoFor(Project).findOneBy.mockResolvedValue(kase);
    repoFor(User).findOneBy.mockResolvedValue(user);
    repoFor(Document).save.mockImplementation((v: unknown) => ({
      id: 'doc-1',
      ...(v as Record<string, unknown>),
    }));
    repoFor(DocumentVersion).save.mockResolvedValue(undefined);

    service = new DocumentsService(
      documents as never,
      versions as never,
      dataSource as never,
      storage as never,
    );
  });

  describe('upload', () => {
    it('creates the document, its version 1 row, and stores the file', async () => {
      const result = await service.upload('case-1', 'user-1', file);

      expect(repoFor(DocumentVersion).save).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-1',
          versionNumber: 1,
          originalFilename: 'passport.pdf',
        }),
      );
      expect(storage.upload).toHaveBeenCalledWith(
        'cases/case-1/documents/doc-1/v1',
        file.buffer,
      );
      expect(result).toEqual(
        expect.objectContaining({ id: 'doc-1', currentVersion: 1 }),
      );
    });

    it('throws when the case does not exist', async () => {
      repoFor(Project).findOneBy.mockResolvedValue(null);
      await expect(service.upload('missing', 'user-1', file)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the uploading user does not exist or is inactive', async () => {
      repoFor(User).findOneBy.mockResolvedValue(null);
      await expect(service.upload('case-1', 'missing', file)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('uploadVersion', () => {
    it('increments the version number and stores the new file', async () => {
      repoFor(Document).findOneBy.mockResolvedValue({
        id: 'doc-1',
        caseId: 'case-1',
        currentVersion: 1,
        deletedAt: null,
      });

      const result = await service.uploadVersion('doc-1', 'user-1', file);

      expect(repoFor(DocumentVersion).save).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'doc-1', versionNumber: 2 }),
      );
      expect(storage.upload).toHaveBeenCalledWith(
        'cases/case-1/documents/doc-1/v2',
        file.buffer,
      );
      expect(result).toEqual(expect.objectContaining({ currentVersion: 2 }));
    });

    it('throws when the document does not exist or is soft-deleted', async () => {
      repoFor(Document).findOneBy.mockResolvedValue(null);
      await expect(
        service.uploadVersion('missing', 'user-1', file),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFileForDownload', () => {
    it('downloads the current version by default', async () => {
      documents.findOneBy.mockResolvedValue({
        id: 'doc-1',
        storageKey: 'cases/case-1/documents/doc-1/v2',
        mediaType: 'application/pdf',
        originalFilename: 'passport.pdf',
        deletedAt: null,
      });

      const result = await service.getFileForDownload('doc-1');

      expect(storage.download).toHaveBeenCalledWith(
        'cases/case-1/documents/doc-1/v2',
      );
      expect(result.mediaType).toBe('application/pdf');
    });

    it('downloads a specific version when requested', async () => {
      documents.findOneBy.mockResolvedValue({
        id: 'doc-1',
        storageKey: 'cases/case-1/documents/doc-1/v2',
        mediaType: 'application/pdf',
        originalFilename: 'passport.pdf',
        deletedAt: null,
      });
      versions.findOneBy.mockResolvedValue({
        storageKey: 'cases/case-1/documents/doc-1/v1',
        originalFilename: 'old.pdf',
      });

      await service.getFileForDownload('doc-1', 1);

      expect(storage.download).toHaveBeenCalledWith(
        'cases/case-1/documents/doc-1/v1',
      );
    });

    it('throws when the requested version does not exist', async () => {
      documents.findOneBy.mockResolvedValue({
        id: 'doc-1',
        storageKey: 'x',
        mediaType: 'application/pdf',
        originalFilename: 'passport.pdf',
        deletedAt: null,
      });
      versions.findOneBy.mockResolvedValue(null);

      await expect(service.getFileForDownload('doc-1', 9)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFileForPreview', () => {
    it('returns preview bytes for a supported active document', async () => {
      documents.findOneBy.mockResolvedValue({
        id: 'doc-1',
        storageKey: 'cases/case-1/documents/doc-1/v1',
        mediaType: 'application/pdf',
        originalFilename: 'passport.pdf',
        deletedAt: null,
      });

      const result = await service.getFileForPreview('doc-1');

      expect(result.mediaType).toBe('application/pdf');
      expect(storage.download).toHaveBeenCalledWith(
        'cases/case-1/documents/doc-1/v1',
      );
    });

    it('rejects an unsupported preview type', async () => {
      documents.findOneBy.mockResolvedValue({
        id: 'doc-1',
        mediaType: 'text/plain',
      });
      await expect(service.getFileForPreview('doc-1')).rejects.toThrow(
        'UNSUPPORTED_DOCUMENT_TYPE',
      );
    });

    it('rejects deleted or missing documents', async () => {
      documents.findOneBy.mockResolvedValue(null);
      await expect(service.getFileForPreview('doc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting deletedAt and deletedBy', async () => {
      documents.findOneBy.mockResolvedValue({
        id: 'doc-1',
        deletedAt: null,
        deletedBy: null,
      });
      documents.save.mockImplementation((v: unknown) => v);

      await service.remove('doc-1', 'user-1');

      expect(documents.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'doc-1',
          deletedAt: expect.any(Date) as Date,
          deletedBy: 'user-1',
        }),
      );
    });

    it('throws when the deleting user does not exist or is inactive', async () => {
      repoFor(User).findOneBy.mockResolvedValue(null);
      await expect(service.remove('doc-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
