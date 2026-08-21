import { ProjectFormDataService } from './project-form-data.service';

describe('ProjectFormDataService', () => {
  let service: ProjectFormDataService;
  let projects: { findOneBy: jest.Mock };
  let contacts: { findOneBy: jest.Mock };
  let companies: { findOneBy: jest.Mock };

  beforeEach(() => {
    projects = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 'project-1',
        title: 'Work permit',
        dueDate: null,
        status: 'TODO',
        contactId: 'contact-1',
        companyId: 'company-1',
      }),
    };
    contacts = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 'contact-1',
        givenNames: 'Jane',
        surname: 'Doe',
        nationality: 'Thai',
        dateOfBirth: '1990-01-01',
        passportNumber: 'AB1234',
        dateOfExpiry: '2028-01-01',
        position: 'Engineer',
        monthlySalary: '85000.00',
        employmentStartDate: '2026-01-01',
      }),
    };
    companies = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 'company-1',
        legalNameEn: 'Example Co., Ltd.',
        legalNameTh: null,
        registrationNumber: '0100000000000',
        registeredAddress: 'Bangkok',
      }),
    };
    service = new ProjectFormDataService(
      projects as never,
      contacts as never,
      companies as never,
    );
  });

  it('returns consolidated data with no missing required fields when the linked records are complete', async () => {
    const result = await service.findForProject('project-1');
    expect(result.missingFields).toEqual([]);
    expect(result.employment).toEqual(
      expect.objectContaining({ monthlySalary: 85000 }),
    );
  });

  it('returns structured missing Applicant and Company fields without blocking the workspace', async () => {
    contacts.findOneBy.mockResolvedValue({
      id: 'contact-1',
      givenNames: null,
      surname: null,
      nationality: null,
      dateOfBirth: null,
      passportNumber: null,
      dateOfExpiry: null,
      position: null,
    });
    companies.findOneBy.mockResolvedValue({
      id: 'company-1',
      legalNameEn: null,
      legalNameTh: null,
      registrationNumber: null,
      registeredAddress: null,
    });
    const result = await service.findForProject('project-1');
    expect(result.missingFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: 'APPLICANT',
          field: 'passportNumber',
        }),
        expect.objectContaining({ section: 'COMPANY', field: 'legalName' }),
        expect.objectContaining({
          section: 'COMPANY',
          field: 'registeredAddress',
        }),
      ]),
    );
  });
});
