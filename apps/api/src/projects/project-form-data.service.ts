import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Project } from './entities/project.entity';

type MissingField = {
  section: 'APPLICANT' | 'COMPANY';
  field: string;
  label: string;
};

const APPLICANT_REQUIRED = [
  ['givenNames', 'First name'],
  ['surname', 'Last name'],
  ['nationality', 'Nationality'],
  ['dateOfBirth', 'Date of birth'],
  ['passportNumber', 'Passport number'],
  ['dateOfExpiry', 'Passport expiry date'],
  ['position', 'Position'],
] as const;

@Injectable()
export class ProjectFormDataService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
  ) {}

  async findForProject(projectId: string) {
    const project = await this.projects.findOneBy({
      id: projectId,
      deletedAt: IsNull(),
    });
    if (!project) throw new NotFoundException('PROJECT_NOT_FOUND');
    const [contact, company] = await Promise.all([
      project.contactId
        ? this.contacts.findOneBy({
            id: project.contactId,
            deletedAt: IsNull(),
          })
        : null,
      project.companyId
        ? this.companies.findOneBy({
            id: project.companyId,
            deletedAt: IsNull(),
          })
        : null,
    ]);
    const missingFields: MissingField[] = [];
    for (const [field, label] of APPLICANT_REQUIRED) {
      if (!contact || !contact[field])
        missingFields.push({ section: 'APPLICANT', field, label });
    }
    if (!company || (!company.legalNameTh && !company.legalNameEn))
      missingFields.push({
        section: 'COMPANY',
        field: 'legalName',
        label: 'Legal company name',
      });
    if (!company?.registrationNumber)
      missingFields.push({
        section: 'COMPANY',
        field: 'registrationNumber',
        label: 'Registration number',
      });
    if (!company?.registeredAddress)
      missingFields.push({
        section: 'COMPANY',
        field: 'registeredAddress',
        label: 'Registered address',
      });
    return {
      project: {
        id: project.id,
        title: project.title,
        dueDate: project.dueDate,
        status: project.status,
        contactId: project.contactId,
        companyId: project.companyId,
      },
      contact,
      passport: contact
        ? {
            passportNumber: contact.passportNumber,
            dateOfIssue: contact.dateOfIssue,
            dateOfExpiry: contact.dateOfExpiry,
            issuingCountry: contact.issuingCountry,
            nationality: contact.nationality,
            dateOfBirth: contact.dateOfBirth,
            sex: contact.sex,
          }
        : null,
      employment: contact
        ? {
            position: contact.position,
            monthlySalary:
              contact.monthlySalary === null
                ? null
                : Number(contact.monthlySalary),
            employmentStartDate: contact.employmentStartDate,
          }
        : null,
      company,
      missingFields,
    };
  }
}
