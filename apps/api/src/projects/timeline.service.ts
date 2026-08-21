import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TimelineEvent } from './entities/timeline.entity';

type TimelineInput = Omit<TimelineEvent, 'id' | 'createdAt'>;

@Injectable()
export class TimelineService {
  private async record(manager: EntityManager, input: TimelineInput) {
    return manager.getRepository(TimelineEvent).save(input);
  }

  recordProjectCreated(
    manager: EntityManager,
    projectId: string,
    createdBy: string,
    title: string,
  ) {
    return this.record(manager, {
      caseId: projectId,
      createdBy,
      eventType: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: projectId,
      title: 'Project created',
      description: title,
      metadata: { projectTitle: title },
    });
  }

  recordTaskCreated(
    manager: EntityManager,
    projectId: string,
    taskId: string,
    createdBy: string,
    title: string,
  ) {
    return this.record(manager, {
      caseId: projectId,
      createdBy,
      eventType: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: taskId,
      title: 'Task created',
      description: title,
      metadata: { taskTitle: title },
    });
  }

  recordTaskStatusChanged(
    manager: EntityManager,
    projectId: string,
    taskId: string,
    createdBy: string,
    oldStatus: string,
    newStatus: string,
  ) {
    return this.record(manager, {
      caseId: projectId,
      createdBy,
      eventType:
        newStatus === 'COMPLETED' ? 'TASK_COMPLETED' : 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: taskId,
      title:
        newStatus === 'COMPLETED' ? 'Task completed' : 'Task status changed',
      description: null,
      metadata: { oldStatus, newStatus },
    });
  }

  recordTaskAssignmentChanged(
    manager: EntityManager,
    projectId: string,
    taskId: string,
    createdBy: string,
    oldAssignee: string | null,
    newAssignee: string | null,
  ) {
    return this.record(manager, {
      caseId: projectId,
      createdBy,
      eventType: 'ASSIGNMENT_CHANGED',
      entityType: 'TASK',
      entityId: taskId,
      title: 'Task assignment changed',
      description: null,
      metadata: { oldAssignee, newAssignee },
    });
  }
}
