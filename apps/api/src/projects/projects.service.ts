import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { User } from '../users/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { RemoveProjectDto } from './dto/remove-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';
import { TimelineService } from './timeline.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    private readonly dataSource: DataSource,
    private readonly timeline: TimelineService,
  ) {}

  async create(dto: CreateProjectDto) {
    return this.dataSource.transaction(async (manager) => {
      const createdBy = await manager
        .getRepository(User)
        .findOneBy({ id: dto.createdById, active: true });
      if (!createdBy) throw new NotFoundException('USER_NOT_FOUND');
      if (dto.companyId) {
        const company = await manager
          .getRepository(Company)
          .findOneBy({ id: dto.companyId, deletedAt: IsNull() });
        if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
      }

      const project = await manager.getRepository(Project).save({
        title: dto.title,
        description: dto.description ?? null,
        contactId: dto.contactId ?? null,
        companyId: dto.companyId ?? null,
        dueDate: dto.dueDate ?? null,
        status: 'TODO',
        completedAt: null,
        createdById: dto.createdById,
        deletedAt: null,
        deletedBy: null,
      });

      await this.timeline.recordProjectCreated(
        manager,
        project.id,
        dto.createdById,
        dto.title,
      );

      return project;
    });
  }

  findAll() {
    return this.projects.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const found = await this.projects.findOneBy({ id, deletedAt: IsNull() });
    if (!found) throw new NotFoundException('PROJECT_NOT_FOUND');
    return found;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const current = await this.findOne(id);
    if (dto.title !== undefined) current.title = dto.title;
    if (dto.description !== undefined) current.description = dto.description;
    if (dto.contactId !== undefined) current.contactId = dto.contactId;
    if (dto.companyId !== undefined) {
      const company = await this.companies.findOneBy({
        id: dto.companyId,
        deletedAt: IsNull(),
      });
      if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
      current.companyId = dto.companyId;
    }
    if (dto.dueDate !== undefined) current.dueDate = dto.dueDate;
    if (dto.status !== undefined) {
      current.status = dto.status;
      current.completedAt =
        dto.status === 'DONE' ? new Date() : current.completedAt;
    }
    return this.projects.save(current);
  }

  async remove(id: string, dto: RemoveProjectDto) {
    const deletedBy = await this.dataSource
      .getRepository(User)
      .findOneBy({ id: dto.deletedById, active: true });
    if (!deletedBy) throw new NotFoundException('USER_NOT_FOUND');
    const current = await this.findOne(id);
    current.deletedAt = new Date();
    current.deletedBy = dto.deletedById;
    await this.projects.save(current);
  }
}
