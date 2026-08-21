import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { Task } from './entities/task.entity';

@Injectable()
export class ChecklistItemsService {
  constructor(
    @InjectRepository(TaskChecklistItem)
    private readonly items: Repository<TaskChecklistItem>,
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
  ) {}

  private async ensureTaskExists(taskId: string) {
    const task = await this.tasks.findOneBy({ id: taskId });
    if (!task) throw new NotFoundException('TASK_NOT_FOUND');
  }

  async create(taskId: string, dto: CreateChecklistItemDto) {
    await this.ensureTaskExists(taskId);
    return this.items.save({
      taskId,
      label: dto.label,
      completed: false,
      completedAt: null,
    });
  }

  async findAllForTask(taskId: string) {
    await this.ensureTaskExists(taskId);
    return this.items.find({ where: { taskId }, order: { createdAt: 'ASC' } });
  }

  async update(
    taskId: string,
    itemId: string,
    completed?: boolean,
    label?: string,
  ) {
    const item = await this.items.findOneBy({ id: itemId, taskId });
    if (!item) throw new NotFoundException('CHECKLIST_ITEM_NOT_FOUND');
    if (completed !== undefined) {
      item.completed = completed;
      item.completedAt = completed ? new Date() : null;
    }
    if (label !== undefined) item.label = label;
    return this.items.save(item);
  }

  async remove(taskId: string, itemId: string) {
    const item = await this.items.findOneBy({ id: itemId, taskId });
    if (!item) throw new NotFoundException('CHECKLIST_ITEM_NOT_FOUND');
    await this.items.remove(item);
  }
}
