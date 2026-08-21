import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Contact } from '../contacts/entities/contact.entity';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { ApplicationSetting } from '../settings/entities/application-setting.entity';
import {
  passportAttentionStatus,
  taskAttentionStatus,
} from './attention-status';

type TaskRow = {
  taskId: string;
  taskTitle: string;
  taskDueDate: string | Date | null;
  taskStatus: string;
  projectId: string;
  projectTitle: string;
};

function dateOnly(value: string | Date | null) {
  if (!value) return null;
  if (!(value instanceof Date)) return value;
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(ApplicationSetting)
    private readonly settings: Repository<ApplicationSetting>,
  ) {}

  async attention(now = new Date()) {
    const [contacts, taskRows, workspace] = await Promise.all([
      this.contacts.find({
        select: {
          id: true,
          name: true,
          passportNumber: true,
          dateOfExpiry: true,
        },
        where: { deletedAt: IsNull() },
      }),
      this.tasks
        .createQueryBuilder('task')
        .innerJoin(
          Project,
          'project',
          'project.id = task.case_id AND project.deleted_at IS NULL',
        )
        .select([
          'task.id AS "taskId"',
          'task.title AS "taskTitle"',
          'task.due_date AS "taskDueDate"',
          'task.status AS "taskStatus"',
          'project.id AS "projectId"',
          'project.title AS "projectTitle"',
        ])
        .where('task.deleted_at IS NULL')
        .andWhere('task.status <> :completed', { completed: 'COMPLETED' })
        .getRawMany<TaskRow>(),
      this.settings
        .find({ order: { updatedAt: 'DESC' }, take: 1 })
        .then(([setting]) => setting),
    ]);
    const timeZone = workspace?.timeZone ?? 'Asia/Bangkok';

    const passports = contacts
      .map((contact) => ({
        contactId: contact.id,
        contactName: contact.name,
        passportNumber: contact.passportNumber,
        dateOfExpiry: contact.dateOfExpiry,
        status: passportAttentionStatus(contact.dateOfExpiry, now, timeZone),
      }))
      .filter((passport) => passport.status !== 'OK');
    const expiredPassports = passports.filter(
      (passport) => passport.status === 'EXPIRED',
    );
    const expiringPassports = passports.filter(
      (passport) =>
        passport.status === 'URGENT' || passport.status === 'UPCOMING',
    );

    const taskItems = taskRows.map((task) => ({
      id: task.taskId,
      title: task.taskTitle,
      dueDate: dateOnly(task.taskDueDate),
      projectId: task.projectId,
      projectTitle: task.projectTitle,
      status: taskAttentionStatus(
        dateOnly(task.taskDueDate),
        task.taskStatus,
        now,
        timeZone,
      ),
    }));
    const overdueTasks = taskItems.filter((task) => task.status === 'OVERDUE');
    const dueSoonTasks = taskItems.filter((task) => task.status === 'DUE_SOON');
    const overdueByProject = new Map<
      string,
      { id: string; title: string; overdueTaskCount: number }
    >();
    for (const task of overdueTasks) {
      const current = overdueByProject.get(task.projectId);
      if (current) current.overdueTaskCount += 1;
      else
        overdueByProject.set(task.projectId, {
          id: task.projectId,
          title: task.projectTitle,
          overdueTaskCount: 1,
        });
    }

    return {
      summary: {
        expiredPassports: expiredPassports.length,
        passportsUrgent: expiringPassports.filter(
          (item) => item.status === 'URGENT',
        ).length,
        passportsUpcoming: expiringPassports.filter(
          (item) => item.status === 'UPCOMING',
        ).length,
        overdueTasks: overdueTasks.length,
        dueSoonTasks: dueSoonTasks.length,
        projectsWithOverdueTasks: overdueByProject.size,
      },
      expiredPassports,
      expiringPassports,
      overdueTasks,
      dueSoonTasks,
      projectsWithOverdueTasks: [...overdueByProject.values()],
    };
  }
}
