import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';

describe('ContactsService', () => {
  let service: ContactsService;
  let contacts: { findOneBy: jest.Mock; find: jest.Mock; save: jest.Mock };
  let users: { findOneBy: jest.Mock };
  let projects: { count: jest.Mock };

  beforeEach(() => {
    contacts = {
      findOneBy: jest.fn(),
      find: jest.fn(),
      save: jest.fn((v: unknown) => Promise.resolve(v)),
    };
    users = {
      findOneBy: jest.fn().mockResolvedValue({ id: 'user-1', active: true }),
    };
    projects = { count: jest.fn().mockResolvedValue(0) };
    service = new ContactsService(
      contacts as never,
      users as never,
      projects as never,
    );
  });

  it('creates a contact', async () => {
    const result = await service.create({ name: 'Jane Doe' });
    expect(result).toEqual(expect.objectContaining({ name: 'Jane Doe' }));
  });

  it('throws NotFoundException when the contact is missing', async () => {
    contacts.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('updates only the provided fields', async () => {
    contacts.findOneBy.mockResolvedValue({
      id: 'contact-1',
      name: 'Old',
      email: 'old@example.com',
    });

    const result = await service.update('contact-1', { name: 'New' });

    expect(result).toEqual(
      expect.objectContaining({ name: 'New', email: 'old@example.com' }),
    );
  });

  it('soft-deletes by setting deletedAt and deletedBy', async () => {
    contacts.findOneBy.mockResolvedValue({ id: 'contact-1', deletedAt: null });

    await service.remove('contact-1', 'user-1');

    expect(contacts.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'contact-1',
        deletedAt: expect.any(Date) as Date,
        deletedBy: 'user-1',
      }),
    );
  });

  it('throws when the deleting user does not exist or is inactive', async () => {
    users.findOneBy.mockResolvedValue(null);
    await expect(service.remove('contact-1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not delete a contact referenced by a project', async () => {
    contacts.findOneBy.mockResolvedValue({ id: 'contact-1', deletedAt: null });
    projects.count.mockResolvedValue(1);
    await expect(service.remove('contact-1', 'user-1')).rejects.toThrow(
      ConflictException,
    );
  });
});
