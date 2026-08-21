import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact } from './entities/contact.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Project) private readonly projects: Repository<Project>,
  ) {}

  create(dto: CreateContactDto) {
    return this.contacts.save({
      name: dto.name,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      notes: dto.notes ?? null,
      deletedAt: null,
      deletedBy: null,
    });
  }

  findAll() {
    return this.contacts.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const found = await this.contacts.findOneBy({ id, deletedAt: IsNull() });
    if (!found) throw new NotFoundException('CONTACT_NOT_FOUND');
    return found;
  }

  async update(id: string, dto: UpdateContactDto) {
    const current = await this.findOne(id);
    Object.assign(current, dto);
    return this.contacts.save(current);
  }

  async remove(id: string, deletedById: string) {
    const deletedBy = await this.users.findOneBy({
      id: deletedById,
      active: true,
    });
    if (!deletedBy) throw new NotFoundException('USER_NOT_FOUND');

    const current = await this.findOne(id);
    const references = await this.projects.count({
      where: { contactId: id, deletedAt: IsNull() },
    });
    if (references) throw new ConflictException('CONTACT_IN_USE');
    current.deletedAt = new Date();
    current.deletedBy = deletedById;
    await this.contacts.save(current);
  }
}
