import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PassportExtractionsService } from './passport-extractions.service';

describe('PassportExtractionsService', () => {
  let service: PassportExtractionsService;
  let extractions: { findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock };
  let documents: { findOneBy: jest.Mock };
  let projects: { findOneBy: jest.Mock };
  let contacts: { findOneBy: jest.Mock; save: jest.Mock };
  let users: { findOneBy: jest.Mock };
  let documentService: { isPreviewSupported: jest.Mock };

  beforeEach(() => {
    extractions = { findOneBy: jest.fn(), create: jest.fn(), save: jest.fn() };
    documents = { findOneBy: jest.fn() };
    projects = { findOneBy: jest.fn() };
    contacts = { findOneBy: jest.fn(), save: jest.fn() };
    users = { findOneBy: jest.fn() };
    documentService = { isPreviewSupported: jest.fn().mockReturnValue(true) };
    service = new PassportExtractionsService(
      extractions as never,
      documents as never,
      projects as never,
      contacts as never,
      users as never,
      documentService as never,
      { extract: jest.fn() },
    );
  });

  it('rejects a deleted or missing document', async () => {
    documents.findOneBy.mockResolvedValue(null);
    await expect(service.run('doc-1')).rejects.toThrow(NotFoundException);
  });

  it('rejects a document type that cannot be previewed or reviewed', async () => {
    documents.findOneBy.mockResolvedValue({
      id: 'doc-1',
      mediaType: 'text/plain',
    });
    documentService.isPreviewSupported.mockReturnValue(false);
    await expect(service.run('doc-1')).rejects.toThrow(BadRequestException);
  });

  it('saves manual corrections as review required', async () => {
    documents.findOneBy.mockResolvedValue({
      id: 'doc-1',
      mediaType: 'application/pdf',
    });
    extractions.findOneBy.mockResolvedValue(null);
    const record = { documentId: 'doc-1', status: 'PENDING' };
    extractions.create.mockReturnValue(record);
    extractions.save.mockResolvedValue(record);

    const result = await service.update('doc-1', { passportNumber: 'AB1234' });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'REVIEW_REQUIRED',
        passportNumber: 'AB1234',
      }),
    );
  });

  it('does not apply values before confirmation', async () => {
    documents.findOneBy.mockResolvedValue({ id: 'doc-1' });
    extractions.findOneBy.mockResolvedValue({
      documentId: 'doc-1',
      status: 'REVIEW_REQUIRED',
    });
    await expect(service.apply('doc-1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('requires explicit overwrite for conflicting contact data', async () => {
    documents.findOneBy.mockResolvedValue({ id: 'doc-1', caseId: 'project-1' });
    extractions.findOneBy.mockResolvedValue({
      documentId: 'doc-1',
      status: 'CONFIRMED',
      surname: 'New',
      givenNames: null,
      passportNumber: null,
      nationality: null,
      dateOfBirth: null,
      sex: null,
      dateOfIssue: null,
      dateOfExpiry: null,
      issuingCountry: null,
    });
    projects.findOneBy.mockResolvedValue({
      id: 'project-1',
      contactId: 'contact-1',
    });
    contacts.findOneBy.mockResolvedValue({
      id: 'contact-1',
      surname: 'Existing',
    });

    await expect(service.apply('doc-1', {})).rejects.toThrow(ConflictException);
    expect(contacts.save).not.toHaveBeenCalled();
  });
});
