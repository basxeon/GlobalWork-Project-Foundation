import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';

export type AuthUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'active'>;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findOneBy({ email: dto.email.toLowerCase() });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }
    if (!user.active) throw new ForbiddenException('USER_INACTIVE');
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const currentUser = this.toAuthUser(user);
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
      user: currentUser,
    };
  }

  async getActiveUser(id: string): Promise<AuthUser> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new UnauthorizedException('UNAUTHORIZED');
    if (!user.active) throw new ForbiddenException('USER_INACTIVE');
    return this.toAuthUser(user);
  }

  async updateProfile(id: string, name: string, requestedEmail: string) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new UnauthorizedException('UNAUTHORIZED');
    const email = requestedEmail.toLowerCase();
    if (email !== user.email && (await this.users.findOneBy({ email }))) {
      throw new ConflictException('EMAIL_IN_USE');
    }
    user.name = name;
    user.email = email;
    return this.toAuthUser(await this.users.save(user));
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('PASSWORD_CONFIRMATION_MISMATCH');
    }
    const user = await this.users.findOneBy({ id });
    if (!user?.passwordHash) throw new UnauthorizedException('UNAUTHORIZED');
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('INVALID_CURRENT_PASSWORD');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.save(user);
    return { changed: true };
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    };
  }
}
