import { ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let users: { find: jest.Mock; findOneBy: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    users = {
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((value) =>
        Promise.resolve({
          id: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...value,
        }),
      ),
    };
    service = new UsersService(users as never);
  });

  it('creates a STAFF user with a hashed password', async () => {
    await service.create({
      name: 'Nina',
      email: 'NINA@example.com',
      role: 'STAFF',
      password: 'Temporary2026!',
    });
    const saved = (
      users.save.mock.calls as unknown as Array<
        [{ email: string; passwordHash: string }]
      >
    )[0][0];
    expect(saved.email).toBe('nina@example.com');
    expect(await bcrypt.compare('Temporary2026!', saved.passwordHash)).toBe(
      true,
    );
  });

  it('rejects duplicate emails', async () => {
    users.findOneBy.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create({
        name: 'Nina',
        email: 'nina@example.com',
        role: 'STAFF',
        password: 'Temporary2026!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('updates allowed user fields', async () => {
    users.findOneBy.mockResolvedValue({
      id: 'user-1',
      name: 'Old',
      email: 'old@example.com',
      role: 'STAFF',
      active: true,
    });
    await expect(
      service.update('user-1', { name: 'New', role: 'ADMIN' }),
    ).resolves.toEqual(expect.objectContaining({ name: 'New', role: 'ADMIN' }));
  });

  it('does not allow an Admin to deactivate themself', async () => {
    await expect(service.deactivate('admin-1', 'admin-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deactivates another user', async () => {
    users.findOneBy.mockResolvedValue({
      id: 'staff-1',
      name: 'Staff',
      email: 'staff@example.com',
      role: 'STAFF',
      active: true,
    });
    await expect(service.deactivate('staff-1', 'admin-1')).resolves.toEqual(
      expect.objectContaining({ active: false }),
    );
  });

  it('resets a password with a bcrypt hash', async () => {
    users.findOneBy.mockResolvedValue({
      id: 'staff-1',
      name: 'Staff',
      email: 'staff@example.com',
      role: 'STAFF',
      active: true,
    });
    await service.resetPassword('staff-1', { password: 'NewTemporary2026!' });
    const saved = (
      users.save.mock.calls as unknown as Array<[{ passwordHash: string }]>
    )[0][0];
    expect(await bcrypt.compare('NewTemporary2026!', saved.passwordHash)).toBe(
      true,
    );
  });
});
