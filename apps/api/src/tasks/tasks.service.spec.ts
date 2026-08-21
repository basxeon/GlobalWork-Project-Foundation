import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let tasks: { findOneBy: jest.Mock; find: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
  let timeline: {
    recordTaskCreated: jest.Mock;
    recordTaskStatusChanged: jest.Mock;
    recordTaskAssignmentChanged: jest.Mock;
  };
  let stateMachine: { canTransition: jest.Mock };

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
    tasks = { findOneBy: jest.fn(), find: jest.fn(), save: jest.fn() };
    timeline = {
      recordTaskCreated: jest.fn().mockResolvedValue(undefined),
      recordTaskStatusChanged: jest.fn().mockResolvedValue(undefined),
      recordTaskAssignmentChanged: jest.fn().mockResolvedValue(undefined),
    };
    stateMachine = { canTransition: jest.fn().mockReturnValue(true) };
    dataSource = {
      transaction: jest.fn((cb: (manager: unknown) => unknown) =>
        cb({ getRepository: (entity: unknown) => repoFor(entity) }),
      ),
      getRepository: jest.fn((entity: unknown) => repoFor(entity)),
    };

    repoFor(Project).findOneBy.mockResolvedValue({
      id: 'case-1',
      deletedAt: null,
    });
    repoFor(User).findOneBy.mockResolvedValue({ id: 'user-1', active: true });
    repoFor(Task).findOneBy.mockResolvedValue({
      id: 'task-1',
      caseId: 'case-1',
      status: 'OPEN',
      assigneeId: null,
      deletedAt: null,
    });
    repoFor(Task).save.mockImplementation((v: unknown) => ({
      id: 'task-1',
      ...(v as Record<string, unknown>),
    }));

    service = new TasksService(
      tasks as never,
      dataSource as never,
      timeline as never,
      stateMachine,
    );
  });

  describe('create', () => {
    const dto = { title: 'Collect passport copy', createdById: 'user-1' };

    it('creates a task with status OPEN and records a timeline event', async () => {
      const result = await service.create('case-1', dto);

      expect(repoFor(Task).save).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          title: 'Collect passport copy',
          status: 'OPEN',
          priority: 'MEDIUM',
        }),
      );
      expect(timeline.recordTaskCreated).toHaveBeenCalledWith(
        expect.anything(),
        'case-1',
        'task-1',
        'user-1',
        'Collect passport copy',
      );
      expect(result).toEqual(expect.objectContaining({ id: 'task-1' }));
    });

    it('throws when the case does not exist', async () => {
      repoFor(Project).findOneBy.mockResolvedValue(null);
      await expect(service.create('missing', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the creating user does not exist or is inactive', async () => {
      repoFor(User).findOneBy.mockResolvedValue(null);
      await expect(service.create('case-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transition', () => {
    it('updates status and records a timeline event', async () => {
      const result = await service.transition(
        'task-1',
        'IN_PROGRESS',
        'user-1',
      );

      expect(stateMachine.canTransition).toHaveBeenCalledWith(
        'OPEN',
        'IN_PROGRESS',
      );
      expect(repoFor(Task).save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'IN_PROGRESS' }),
      );
      expect(timeline.recordTaskStatusChanged).toHaveBeenCalledWith(
        expect.anything(),
        'case-1',
        'task-1',
        'user-1',
        'OPEN',
        'IN_PROGRESS',
      );
      expect(result).toEqual(
        expect.objectContaining({ status: 'IN_PROGRESS' }),
      );
    });

    it('sets completedAt when transitioning to COMPLETED', async () => {
      const result = await service.transition('task-1', 'COMPLETED', 'user-1');
      expect(result).toEqual(
        expect.objectContaining({ completedAt: expect.any(Date) as Date }),
      );
    });

    it('rejects a transition the state machine disallows', async () => {
      stateMachine.canTransition.mockReturnValue(false);
      await expect(
        service.transition('task-1', 'COMPLETED', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the task does not exist', async () => {
      repoFor(Task).findOneBy.mockResolvedValue(null);
      await expect(
        service.transition('missing', 'IN_PROGRESS', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign', () => {
    it('sets the assignee and records a timeline event', async () => {
      const result = await service.assign('task-1', 'user-2', 'user-1');

      expect(repoFor(Task).save).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'user-2' }),
      );
      expect(timeline.recordTaskAssignmentChanged).toHaveBeenCalledWith(
        expect.anything(),
        'case-1',
        'task-1',
        'user-1',
        null,
        'user-2',
      );
      expect(result).toEqual(expect.objectContaining({ assigneeId: 'user-2' }));
    });

    it('throws when the assignee does not exist or is inactive', async () => {
      repoFor(User).findOneBy.mockResolvedValue(null);
      await expect(
        service.assign('task-1', 'missing', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting deletedAt and deletedBy', async () => {
      tasks.findOneBy.mockResolvedValue({ id: 'task-1', deletedAt: null });
      tasks.save.mockImplementation((v: unknown) => v);

      await service.remove('task-1', 'user-1');

      expect(tasks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          deletedAt: expect.any(Date) as Date,
          deletedBy: 'user-1',
        }),
      );
    });

    it('throws when the deleting user does not exist or is inactive', async () => {
      repoFor(User).findOneBy.mockResolvedValue(null);
      await expect(service.remove('task-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
