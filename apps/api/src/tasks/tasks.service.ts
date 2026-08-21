import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import { TimelineService } from '../projects/timeline.service';
import { User } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';
import { TaskStateMachine } from './task-state-machine';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly timeline: TimelineService,
    private readonly stateMachine: TaskStateMachine,
  ) {}

  async create(caseId: string, dto: CreateTaskDto) {
    return this.dataSource.transaction(async (manager) => {
      const project = await manager
        .getRepository(Project)
        .findOneBy({ id: caseId, deletedAt: IsNull() });
      if (!project) throw new NotFoundException('PROJECT_NOT_FOUND');

      const createdBy = await manager
        .getRepository(User)
        .findOneBy({ id: dto.createdById, active: true });
      if (!createdBy) throw new NotFoundException('USER_NOT_FOUND');

      const task = await manager.getRepository(Task).save({
        caseId,
        title: dto.title,
        description: dto.description ?? null,
        assigneeId: null,
        dueDate: dto.dueDate ?? null,
        priority: dto.priority ?? 'MEDIUM',
        status: 'OPEN',
        completedAt: null,
        createdById: dto.createdById,
        deletedAt: null,
        deletedBy: null,
      });

      await this.timeline.recordTaskCreated(
        manager,
        caseId,
        task.id,
        dto.createdById,
        dto.title,
      );

      return task;
    });
  }

  findAllForCase(caseId: string) {
    return this.tasks.find({
      where: { caseId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  findAllGlobal() {
    return this.tasks
      .createQueryBuilder('task')
      .innerJoin(
        'projects',
        'project',
        'project.id = task.case_id AND project.deleted_at IS NULL',
      )
      .leftJoin('task_checklist_items', 'item', 'item.task_id = task.id')
      .select([
        'task.id AS id',
        'task.case_id AS "projectId"',
        'project.title AS "projectTitle"',
        'task.title AS title',
        'task.description AS description',
        `TO_CHAR(task.due_date, 'YYYY-MM-DD') AS "dueDate"`,
        'task.priority AS priority',
        'task.status AS status',
        'task.created_at AS "createdAt"',
        'task.updated_at AS "updatedAt"',
        'COUNT(item.id)::int AS "checklistTotal"',
        'COUNT(item.id) FILTER (WHERE item.completed = true)::int AS "checklistCompleted"',
      ])
      .where('task.deleted_at IS NULL')
      .andWhere("task.status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED')")
      .groupBy('task.id, project.id')
      .orderBy('task.updated_at', 'DESC')
      .getRawMany();
  }

  async findOne(id: string) {
    const found = await this.tasks.findOneBy({ id, deletedAt: IsNull() });
    if (!found) throw new NotFoundException('TASK_NOT_FOUND');
    return found;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const current = await this.findOne(id);
    if (dto.title !== undefined) current.title = dto.title;
    if (dto.description !== undefined) current.description = dto.description;
    if (dto.dueDate !== undefined) current.dueDate = dto.dueDate;
    if (dto.priority !== undefined) current.priority = dto.priority;
    return this.tasks.save(current);
  }

  async transition(id: string, targetStatus: string, changedById: string) {
    return this.dataSource.transaction(async (manager) => {
      const tasks = manager.getRepository(Task);
      const value = await tasks.findOneBy({ id, deletedAt: IsNull() });
      if (!value) throw new NotFoundException('TASK_NOT_FOUND');

      const changedBy = await manager
        .getRepository(User)
        .findOneBy({ id: changedById, active: true });
      if (!changedBy) throw new NotFoundException('USER_NOT_FOUND');

      if (!this.stateMachine.canTransition(value.status, targetStatus)) {
        throw new BadRequestException('INVALID_TASK_TRANSITION');
      }

      const oldStatus = value.status;
      value.status = targetStatus;
      value.completedAt =
        targetStatus === 'COMPLETED' ? new Date() : value.completedAt;
      await tasks.save(value);

      await this.timeline.recordTaskStatusChanged(
        manager,
        value.caseId,
        id,
        changedById,
        oldStatus,
        targetStatus,
      );

      return value;
    });
  }

  async assign(id: string, assigneeId: string, assignedById: string) {
    return this.dataSource.transaction(async (manager) => {
      const tasks = manager.getRepository(Task);
      const value = await tasks.findOneBy({ id, deletedAt: IsNull() });
      if (!value) throw new NotFoundException('TASK_NOT_FOUND');

      const assignee = await manager
        .getRepository(User)
        .findOneBy({ id: assigneeId, active: true });
      if (!assignee) throw new NotFoundException('USER_NOT_FOUND');

      const assignedBy = await manager
        .getRepository(User)
        .findOneBy({ id: assignedById, active: true });
      if (!assignedBy) throw new NotFoundException('USER_NOT_FOUND');

      const oldAssigneeId = value.assigneeId;
      value.assigneeId = assigneeId;
      await tasks.save(value);

      await this.timeline.recordTaskAssignmentChanged(
        manager,
        value.caseId,
        id,
        assignedById,
        oldAssigneeId,
        assigneeId,
      );

      return value;
    });
  }

  async remove(id: string, deletedById: string) {
    const deletedBy = await this.dataSource
      .getRepository(User)
      .findOneBy({ id: deletedById, active: true });
    if (!deletedBy) throw new NotFoundException('USER_NOT_FOUND');

    const task = await this.findOne(id);
    task.deletedAt = new Date();
    task.deletedBy = deletedById;
    await this.tasks.save(task);
  }
}
