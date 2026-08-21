import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

export type ManagedUser = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'active' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async findAll(): Promise<ManagedUser[]> {
    return (await this.users.find({ order: { name: 'ASC' } })).map((user) =>
      this.toResponse(user),
    );
  }

  async create(dto: CreateUserDto): Promise<ManagedUser> {
    const email = dto.email.toLowerCase();
    await this.ensureEmailAvailable(email);
    const user = await this.users.save({
      name: dto.name,
      email,
      role: dto.role,
      active: true,
      passwordHash: await bcrypt.hash(dto.password, 12),
    });
    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<ManagedUser> {
    const user = await this.findEntity(id);
    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase();
      if (email !== user.email) await this.ensureEmailAvailable(email);
      user.email = email;
    }
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role;
    return this.toResponse(await this.users.save(user));
  }

  async activate(id: string): Promise<ManagedUser> {
    const user = await this.findEntity(id);
    user.active = true;
    return this.toResponse(await this.users.save(user));
  }

  async deactivate(id: string, currentUserId: string): Promise<ManagedUser> {
    if (id === currentUserId)
      throw new ForbiddenException('CANNOT_DEACTIVATE_SELF');
    const user = await this.findEntity(id);
    user.active = false;
    return this.toResponse(await this.users.save(user));
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<ManagedUser> {
    const user = await this.findEntity(id);
    user.passwordHash = await bcrypt.hash(dto.password, 12);
    return this.toResponse(await this.users.save(user));
  }

  private async findEntity(id: string) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return user;
  }

  private async ensureEmailAvailable(email: string) {
    const existing = await this.users.findOneBy({ email });
    if (existing) throw new ConflictException('EMAIL_IN_USE');
  }

  private toResponse(user: User): ManagedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
