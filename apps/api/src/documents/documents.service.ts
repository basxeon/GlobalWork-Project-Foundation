import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/entities/user.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Document } from './entities/document.entity';
import { decodeUploadFilename } from './filename';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versions: Repository<DocumentVersion>,
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async upload(
    caseId: string,
    uploadedById: string,
    file: Express.Multer.File,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const project = await manager
        .getRepository(Project)
        .findOneBy({ id: caseId, deletedAt: IsNull() });
      if (!project) throw new NotFoundException('PROJECT_NOT_FOUND');

      const uploadedBy = await manager
        .getRepository(User)
        .findOneBy({ id: uploadedById, active: true });
      if (!uploadedBy) throw new NotFoundException('USER_NOT_FOUND');

      const originalFilename = decodeUploadFilename(file.originalname);

      const document = await manager.getRepository(Document).save({
        caseId,
        originalFilename,
        displayName: originalFilename,
        category: 'OTHER',
        mediaType: file.mimetype,
        storageKey: '',
        currentVersion: 1,
        uploadedById,
        deletedAt: null,
        deletedBy: null,
      });

      const storageKey = `cases/${caseId}/documents/${document.id}/v1`;
      const checksum = createHash('sha256').update(file.buffer).digest('hex');

      document.storageKey = storageKey;
      await manager.getRepository(Document).save(document);

      await manager.getRepository(DocumentVersion).save({
        documentId: document.id,
        versionNumber: 1,
        storageKey,
        sizeBytes: file.buffer.length,
        checksum,
        originalFilename,
        uploadedById,
      });

      await this.storage.upload(storageKey, file.buffer);

      return document;
    });
  }

  async uploadVersion(
    documentId: string,
    uploadedById: string,
    file: Express.Multer.File,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const document = await manager
        .getRepository(Document)
        .findOneBy({ id: documentId, deletedAt: IsNull() });
      if (!document) throw new NotFoundException('DOCUMENT_NOT_FOUND');

      const uploadedBy = await manager
        .getRepository(User)
        .findOneBy({ id: uploadedById, active: true });
      if (!uploadedBy) throw new NotFoundException('USER_NOT_FOUND');

      const originalFilename = decodeUploadFilename(file.originalname);
      const versionNumber = document.currentVersion + 1;
      const storageKey = `cases/${document.caseId}/documents/${document.id}/v${versionNumber}`;
      const checksum = createHash('sha256').update(file.buffer).digest('hex');

      document.currentVersion = versionNumber;
      document.storageKey = storageKey;
      document.originalFilename = originalFilename;
      document.mediaType = file.mimetype;
      await manager.getRepository(Document).save(document);

      await manager.getRepository(DocumentVersion).save({
        documentId: document.id,
        versionNumber,
        storageKey,
        sizeBytes: file.buffer.length,
        checksum,
        originalFilename,
        uploadedById,
      });

      await this.storage.upload(storageKey, file.buffer);

      return document;
    });
  }

  findAllForCase(caseId: string) {
    return this.documents.find({
      where: { caseId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  findAllGlobal() {
    return this.documents
      .createQueryBuilder('document')
      .innerJoin(
        'projects',
        'project',
        'project.id = document.case_id AND project.deleted_at IS NULL',
      )
      .innerJoin('users', 'uploader', 'uploader.id = document.uploaded_by_id')
      .leftJoin(
        'document_versions',
        'version',
        'version.document_id = document.id AND version.version_number = document.current_version',
      )
      .leftJoin(
        'passport_extractions',
        'extraction',
        'extraction.document_id = document.id',
      )
      .select([
        'document.id AS id',
        'document.case_id AS "projectId"',
        'project.title AS "projectTitle"',
        'document.display_name AS "displayName"',
        'document.original_filename AS "originalFilename"',
        'document.category AS category',
        'document.media_type AS "mediaType"',
        'document.current_version AS "currentVersion"',
        'version.size_bytes AS "sizeBytes"',
        'uploader.name AS "uploadedBy"',
        'document.created_at AS "createdAt"',
        'document.updated_at AS "updatedAt"',
        'extraction.status AS "passportReviewStatus"',
        `CASE
          WHEN extraction.date_of_expiry < CURRENT_DATE THEN 'EXPIRED'
          WHEN extraction.date_of_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'URGENT'
          WHEN extraction.date_of_expiry <= CURRENT_DATE + INTERVAL '90 days' THEN 'UPCOMING'
          ELSE NULL
        END AS "expiryWarning"`,
      ])
      .where('document.deleted_at IS NULL')
      .orderBy('document.created_at', 'DESC')
      .getRawMany();
  }

  async updateMetadata(id: string, displayName?: string, category?: string) {
    const document = await this.findOne(id);
    if (displayName !== undefined) document.displayName = displayName;
    if (category !== undefined) document.category = category;
    return this.documents.save(document);
  }

  async findOne(id: string) {
    const found = await this.documents.findOneBy({ id, deletedAt: IsNull() });
    if (!found) throw new NotFoundException('DOCUMENT_NOT_FOUND');
    return found;
  }

  async listVersions(documentId: string) {
    await this.findOne(documentId);
    return this.versions.find({
      where: { documentId },
      order: { versionNumber: 'DESC' },
    });
  }

  async getFileForDownload(id: string, versionNumber?: number) {
    const document = await this.findOne(id);

    if (versionNumber === undefined) {
      const buffer = await this.storage.download(document.storageKey);
      return {
        buffer,
        mediaType: document.mediaType,
        filename: document.originalFilename,
      };
    }

    const version = await this.versions.findOneBy({
      documentId: id,
      versionNumber,
    });
    if (!version) throw new NotFoundException('DOCUMENT_VERSION_NOT_FOUND');

    const buffer = await this.storage.download(version.storageKey);
    return {
      buffer,
      mediaType: document.mediaType,
      filename: version.originalFilename,
    };
  }

  async getFileForPreview(id: string) {
    const document = await this.findOne(id);
    if (!this.isPreviewSupported(document.mediaType)) {
      throw new BadRequestException('UNSUPPORTED_DOCUMENT_TYPE');
    }
    const buffer = await this.storage.download(document.storageKey);
    return {
      buffer,
      mediaType: document.mediaType,
      filename: document.originalFilename,
    };
  }

  isPreviewSupported(mediaType: string) {
    return [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
    ].includes(mediaType);
  }

  async remove(id: string, deletedById: string) {
    const deletedBy = await this.dataSource
      .getRepository(User)
      .findOneBy({ id: deletedById, active: true });
    if (!deletedBy) throw new NotFoundException('USER_NOT_FOUND');

    const document = await this.findOne(id);
    document.deletedAt = new Date();
    document.deletedBy = deletedById;
    await this.documents.save(document);
  }
}
