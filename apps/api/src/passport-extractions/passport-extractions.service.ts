import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Contact } from '../contacts/entities/contact.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentsService } from '../documents/documents.service';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { ApplyPassportExtractionDto } from './dto/apply-passport-extraction.dto';
import { UpdatePassportExtractionDto } from './dto/update-passport-extraction.dto';
import { PassportExtraction } from './entities/passport-extraction.entity';
import { PassportOcrService } from './passport-ocr.service';

const COPY_FIELDS = [
  ['surname', 'surname'],
  ['givenNames', 'givenNames'],
  ['passportNumber', 'passportNumber'],
  ['nationality', 'nationality'],
  ['dateOfBirth', 'dateOfBirth'],
  ['sex', 'sex'],
  ['dateOfIssue', 'dateOfIssue'],
  ['dateOfExpiry', 'dateOfExpiry'],
  ['issuingCountry', 'issuingCountry'],
] as const;

@Injectable()
export class PassportExtractionsService {
  constructor(
    @InjectRepository(PassportExtraction)
    private readonly extractions: Repository<PassportExtraction>,
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly documentService: DocumentsService,
    private readonly ocr: PassportOcrService,
  ) {}

  async run(documentId: string) {
    await this.ensureProcessableDocument(documentId);
    let extraction = await this.extractions.findOneBy({ documentId });
    if (!extraction)
      extraction = this.extractions.create({ documentId, status: 'PENDING' });
    extraction.status = 'PROCESSING';
    extraction.errorMessage = null;
    extraction = await this.extractions.save(extraction);
    const result = await this.ocr.extract();
    extraction.status = 'FAILED';
    extraction.errorMessage = result.errorMessage;
    extraction.extractedAt = new Date();
    return this.toResponse(await this.extractions.save(extraction));
  }

  async findOne(documentId: string) {
    await this.ensureDocument(documentId);
    const extraction = await this.extractions.findOneBy({ documentId });
    if (!extraction)
      throw new NotFoundException('PASSPORT_EXTRACTION_NOT_FOUND');
    return this.toResponse(extraction);
  }

  async update(documentId: string, dto: UpdatePassportExtractionDto) {
    await this.ensureProcessableDocument(documentId);
    let extraction = await this.extractions.findOneBy({ documentId });
    if (!extraction)
      extraction = this.extractions.create({ documentId, status: 'PENDING' });
    Object.assign(extraction, {
      surname: dto.surname ?? extraction.surname,
      givenNames: dto.givenNames ?? extraction.givenNames,
      passportNumber: dto.passportNumber ?? extraction.passportNumber,
      nationality: dto.nationality ?? extraction.nationality,
      dateOfBirth: dto.dateOfBirth ?? extraction.dateOfBirth,
      sex: dto.sex ?? extraction.sex,
      dateOfIssue: dto.dateOfIssue ?? extraction.dateOfIssue,
      dateOfExpiry: dto.dateOfExpiry ?? extraction.dateOfExpiry,
      issuingCountry: dto.issuingCountry ?? extraction.issuingCountry,
      confidence:
        dto.confidence === undefined
          ? extraction.confidence
          : String(dto.confidence),
      status: 'REVIEW_REQUIRED',
      errorMessage: null,
      extractedAt: extraction.extractedAt ?? new Date(),
    });
    return this.toResponse(await this.extractions.save(extraction));
  }

  async confirm(documentId: string, confirmedById: string) {
    const extraction = await this.findEntity(documentId);
    const user = await this.users.findOneBy({
      id: confirmedById,
      active: true,
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (extraction.status !== 'REVIEW_REQUIRED')
      throw new BadRequestException('EXTRACTION_REVIEW_REQUIRED');
    extraction.status = 'CONFIRMED';
    extraction.confirmedAt = new Date();
    extraction.confirmedBy = confirmedById;
    return this.toResponse(await this.extractions.save(extraction));
  }

  async apply(documentId: string, dto: ApplyPassportExtractionDto) {
    const extraction = await this.findEntity(documentId);
    if (extraction.status !== 'CONFIRMED')
      throw new BadRequestException('EXTRACTION_NOT_CONFIRMED');
    const document = await this.ensureDocument(documentId);
    const project = await this.projects.findOneBy({
      id: document.caseId,
      deletedAt: IsNull(),
    });
    if (!project || !project.contactId)
      throw new BadRequestException('PROJECT_CONTACT_NOT_LINKED');
    const contact = await this.contacts.findOneBy({
      id: project.contactId,
      deletedAt: IsNull(),
    });
    if (!contact) throw new NotFoundException('CONTACT_NOT_FOUND');
    const conflicts = COPY_FIELDS.filter(([source, target]) => {
      const value = extraction[source];
      const current = contact[target];
      return (
        value !== null &&
        value !== '' &&
        current !== null &&
        current !== '' &&
        value !== current
      );
    }).map(([source]) => source);
    if (conflicts.length && !dto.overwrite) {
      throw new ConflictException({
        code: 'CONTACT_FIELD_CONFLICT',
        message: 'Contact has conflicting passport fields.',
        fields: conflicts,
      });
    }
    for (const [source, target] of COPY_FIELDS) {
      const value = extraction[source];
      if (value !== null && value !== '') contact[target] = value;
    }
    await this.contacts.save(contact);
    return {
      contactId: contact.id,
      appliedFields: COPY_FIELDS.filter(
        ([source]) => extraction[source] !== null,
      ).map(([source]) => source),
    };
  }

  private async ensureDocument(documentId: string) {
    const document = await this.documents.findOneBy({
      id: documentId,
      deletedAt: IsNull(),
    });
    if (!document) throw new NotFoundException('DOCUMENT_NOT_FOUND');
    return document;
  }

  private async ensureProcessableDocument(documentId: string) {
    const document = await this.ensureDocument(documentId);
    if (!this.documentService.isPreviewSupported(document.mediaType))
      throw new BadRequestException('UNSUPPORTED_DOCUMENT_TYPE');
    return document;
  }

  private async findEntity(documentId: string) {
    await this.ensureDocument(documentId);
    const extraction = await this.extractions.findOneBy({ documentId });
    if (!extraction)
      throw new NotFoundException('PASSPORT_EXTRACTION_NOT_FOUND');
    return extraction;
  }

  private toResponse(extraction: PassportExtraction) {
    const date = extraction.dateOfExpiry
      ? new Date(`${extraction.dateOfExpiry}T00:00:00Z`)
      : null;
    const days = date
      ? Math.ceil((date.getTime() - Date.now()) / 86_400_000)
      : null;
    return {
      ...extraction,
      rawText: undefined,
      confidence:
        extraction.confidence === null ? null : Number(extraction.confidence),
      expiryWarning:
        days === null
          ? null
          : days < 0
            ? 'EXPIRED'
            : days <= 180
              ? 'EXPIRING_SOON'
              : null,
    };
  }
}
