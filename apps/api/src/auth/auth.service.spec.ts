import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: { findOneBy: jest.Mock; save: jest.Mock };
  let jwt: { signAsync: jest.Mock };

  beforeEach(() => {
    users = {
      findOneBy: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    service = new AuthService(users as never, jwt as never);
  });

  it('returns an access token for valid credentials', async () => {
    users.findOneBy.mockResolvedValue({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'ADMIN',
      active: true,
      passwordHash: await bcrypt.hash('correct-password', 4),
    });

    await expect(
      service.login({
        email: 'ADMIN@example.com',
        password: 'correct-password',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'user-1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        active: true,
      },
    });
  });

  it('rejects an invalid password', async () => {
    users.findOneBy.mockResolvedValue({
      passwordHash: await bcrypt.hash('correct-password', 4),
      active: true,
    });
    await expect(
      service.login({ email: 'admin@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an inactive user before issuing a token', async () => {
    users.findOneBy.mockResolvedValue({
      passwordHash: 'unused',
      active: false,
    });
    await expect(
      service.login({ email: 'admin@example.com', password: 'any-password' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects a user who becomes inactive after login', async () => {
    users.findOneBy.mockResolvedValue({ id: 'user-1', active: false });
    await expect(service.getActiveUser('user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('changes a password after validating the current password', async () => {
    users.findOneBy.mockResolvedValue({
      id: 'user-1',
      passwordHash: await bcrypt.hash('current-password', 4),
    });
    await expect(
      service.changePassword(
        'user-1',
        'current-password',
        'new-password',
        'new-password',
      ),
    ).resolves.toEqual({ changed: true });
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: expect.any(String) as string }),
    );
  });

  it('rejects a wrong current password', async () => {
    users.findOneBy.mockResolvedValue({
      id: 'user-1',
      passwordHash: await bcrypt.hash('current-password', 4),
    });
    await expect(
      service.changePassword('user-1', 'wrong', 'new-password', 'new-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects mismatched password confirmation', async () => {
    await expect(
      service.changePassword('user-1', 'current', 'new-password', 'different'),
    ).rejects.toThrow('PASSWORD_CONFIRMATION_MISMATCH');
  });
});
