import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChecklistItemsService } from './checklist-items.service';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { RemoveTaskDto } from './dto/remove-task.dto';
import { TransitionTaskDto } from './dto/transition-task.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

const TASK_ID_PARAM = { name: 'id', format: 'uuid' as const };

@ApiTags('Tasks')
@Controller()
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly checklistItems: ChecklistItemsService,
  ) {}

  @Post('projects/:projectId/tasks')
  @ApiOperation({
    summary: 'Create a task on a project (status defaults to OPEN)',
  })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created.' })
  @ApiResponse({
    status: 404,
    description: 'PROJECT_NOT_FOUND or USER_NOT_FOUND.',
  })
  create(@Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
    return this.tasks.create(projectId, dto);
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'List tasks for a project' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Non-deleted tasks, newest first.' })
  findAllForCase(@Param('projectId') projectId: string) {
    return this.tasks.findAllForCase(projectId);
  }

  @Get('tasks')
  @ApiOperation({
    summary: 'List all operational tasks with Project and checklist progress',
  })
  findAllGlobal() {
    return this.tasks.findAllGlobal();
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get one task' })
  @ApiParam(TASK_ID_PARAM)
  @ApiResponse({ status: 200, description: 'Task found.' })
  @ApiResponse({ status: 404, description: 'TASK_NOT_FOUND' })
  findOne(@Param('id') id: string) {
    return this.tasks.findOne(id);
  }

  @Patch('tasks/:id')
  @ApiOperation({
    summary: 'Update title/description/dueDate/priority',
    description:
      'Status and assignee are not editable here — use /tasks/:id/transition and /tasks/:id/assign to preserve the timeline audit trail.',
  })
  @ApiParam(TASK_ID_PARAM)
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated.' })
  @ApiResponse({ status: 404, description: 'TASK_NOT_FOUND' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }

  @Post('tasks/:id/transition')
  @ApiOperation({
    summary: 'Transition a task to a new status',
    description:
      'OPEN -> IN_PROGRESS/ON_HOLD/CANCELLED; IN_PROGRESS -> ON_HOLD/COMPLETED/CANCELLED; ON_HOLD -> IN_PROGRESS/CANCELLED. COMPLETED and CANCELLED are terminal. Completing a task has no automatic effect on its case.',
  })
  @ApiParam(TASK_ID_PARAM)
  @ApiBody({ type: TransitionTaskDto })
  @ApiResponse({ status: 201, description: 'Task transitioned.' })
  @ApiResponse({ status: 400, description: 'INVALID_TASK_TRANSITION' })
  @ApiResponse({
    status: 404,
    description: 'TASK_NOT_FOUND or USER_NOT_FOUND.',
  })
  transition(@Param('id') id: string, @Body() dto: TransitionTaskDto) {
    return this.tasks.transition(id, dto.targetStatus, dto.changedById);
  }

  @Post('tasks/:id/assign')
  @ApiOperation({ summary: 'Assign a task to a user' })
  @ApiParam(TASK_ID_PARAM)
  @ApiBody({ type: AssignTaskDto })
  @ApiResponse({ status: 201, description: 'Task assigned.' })
  @ApiResponse({
    status: 404,
    description: 'TASK_NOT_FOUND or USER_NOT_FOUND.',
  })
  assign(@Param('id') id: string, @Body() dto: AssignTaskDto) {
    return this.tasks.assign(id, dto.assigneeId, dto.assignedById);
  }

  @Delete('tasks/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a task' })
  @ApiParam(TASK_ID_PARAM)
  @ApiBody({ type: RemoveTaskDto })
  @ApiResponse({ status: 204, description: 'Task soft-deleted.' })
  @ApiResponse({
    status: 404,
    description: 'TASK_NOT_FOUND or USER_NOT_FOUND.',
  })
  remove(@Param('id') id: string, @Body() dto: RemoveTaskDto) {
    return this.tasks.remove(id, dto.deletedById);
  }

  @Post('tasks/:id/checklist-items')
  @ApiOperation({ summary: 'Add a checklist item to a task' })
  @ApiParam(TASK_ID_PARAM)
  @ApiBody({ type: CreateChecklistItemDto })
  @ApiResponse({ status: 201, description: 'Checklist item created.' })
  @ApiResponse({ status: 404, description: 'TASK_NOT_FOUND' })
  addChecklistItem(
    @Param('id') id: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.checklistItems.create(id, dto);
  }

  @Get('tasks/:id/checklist-items')
  @ApiOperation({ summary: "List a task's checklist items" })
  @ApiParam(TASK_ID_PARAM)
  @ApiResponse({ status: 200, description: 'Checklist items, creation order.' })
  @ApiResponse({ status: 404, description: 'TASK_NOT_FOUND' })
  listChecklistItems(@Param('id') id: string) {
    return this.checklistItems.findAllForTask(id);
  }

  @Patch('tasks/:id/checklist-items/:itemId')
  @ApiOperation({ summary: 'Update a checklist item completion or label' })
  @ApiParam(TASK_ID_PARAM)
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiBody({ type: UpdateChecklistItemDto })
  @ApiResponse({ status: 200, description: 'Checklist item updated.' })
  @ApiResponse({ status: 404, description: 'CHECKLIST_ITEM_NOT_FOUND' })
  updateChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.checklistItems.update(id, itemId, dto.completed, dto.label);
  }

  @Delete('tasks/:id/checklist-items/:itemId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a checklist item' })
  @ApiParam(TASK_ID_PARAM)
  @ApiParam({ name: 'itemId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Checklist item removed.' })
  @ApiResponse({ status: 404, description: 'CHECKLIST_ITEM_NOT_FOUND' })
  removeChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.checklistItems.remove(id, itemId);
  }
}
