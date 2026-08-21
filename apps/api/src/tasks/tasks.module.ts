import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../projects/entities/project.entity';
import { TimelineEvent } from '../projects/entities/timeline.entity';
import { TimelineService } from '../projects/timeline.service';
import { ChecklistItemsService } from './checklist-items.service';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { Task } from './entities/task.entity';
import { TaskStateMachine } from './task-state-machine';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskChecklistItem, Project, TimelineEvent]),
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    ChecklistItemsService,
    TaskStateMachine,
    TimelineService,
  ],
})
export class TasksModule {}
