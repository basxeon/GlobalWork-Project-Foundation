import { NotFoundException } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Project } from './entities/project.entity';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projects: { findOneBy: jest.Mock; find: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
  let companies: { findOneBy: jest.Mock };
  let timeline: { recordProjectCreated: jest.Mock };

  const managerRepos = new Map<
    unknown,
    { findOneBy: jest.Mock; save: jest.Mock }
  >();

  function repoFor(entity: unknown) {
    if (!managerRepos.has(entity)) {
      managerRepos.set(entity, { findOneBy: jest.fn(), save: jest.fn() });
    }
    return managerRepos.get(entity)!;
  }

  beforeEach(() => {
    managerRepos.clear();
    projects = { findOneBy: jest.fn(), find: jest.fn(), save: jest.fn() };
    companies = { findOneBy: jest.fn() };
    timeline = { recordProjectCreated: jest.fn().mockResolvedValue(undefined) };
    dataSource = {
      transaction: jest.fn((cb: (manager: unknown) => unknown) =>
        cb({ getRepository: (entity: unknown) => repoFor(entity) }),
      ),
      getRepository: jest.fn((entity: unknown) => repoFor(entity)),
    };

    repoFor(User).findOneBy.mockResolvedValue({ id: 'user-1', active: true });
    repoFor(Project).save.mockImplementation((v: unknown) => ({
      id: 'project-1',
      ...(v as Record<string, unknown>),
    }));

    service = new ProjectsService(
      projects as never,
      companies as never,
      dataSource as never,
      timeline as never,
    );
  });

  describe('create', () => {
    it('creates a project with status TODO and records a timeline event', async () => {
      const result = await service.create({
        title: 'Home network rebuild',
        createdById: 'user-1',
      });

      expect(repoFor(Project).save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Home network rebuild',
          status: 'TODO',
        }),
      );
      expect(timeline.recordProjectCreated).toHaveBeenCalledWith(
        expect.anything(),
        'project-1',
        'user-1',
        'Home network rebuild',
      );
      expect(result).toEqual(expect.objectContaining({ id: 'project-1' }));
    });

    it('throws when the creating user does not exist or is inactive', async () => {
      repoFor(User).findOneBy.mockResolvedValue(null);
      await expect(
        service.create({ title: 'x', createdById: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      projects.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('sets completedAt when status moves to DONE', async () => {
      projects.findOneBy.mockResolvedValue({
        id: 'project-1',
        status: 'DOING',
        completedAt: null,
      });
      projects.save.mockImplementation((v: unknown) => v);

      const result = await service.update('project-1', { status: 'DONE' });

      expect(result).toEqual(
        expect.objectContaining({
          status: 'DONE',
          completedAt: expect.any(Date) as Date,
        }),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting deletedAt and deletedBy', async () => {
      projects.findOneBy.mockResolvedValue({
        id: 'project-1',
        deletedAt: null,
      });
      projects.save.mockImplementation((v: unknown) => v);

      await service.remove('project-1', { deletedById: 'user-1' });

      expect(projects.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'project-1',
          deletedAt: expect.any(Date) as Date,
          deletedBy: 'user-1',
        }),
      );
    });

    it('throws when the deleting user does not exist or is inactive', async () => {
      repoFor(User).findOneBy.mockResolvedValue(null);
      projects.findOneBy.mockResolvedValue({ id: 'project-1' });
      await expect(
        service.remove('project-1', { deletedById: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
