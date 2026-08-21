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
import { CreateProjectDto } from './dto/create-project.dto';
import { RemoveProjectDto } from './dto/remove-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';
import { ProjectFormDataService } from './project-form-data.service';

const PROJECT_ID_PARAM = { name: 'id', format: 'uuid' as const };

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly formData: ProjectFormDataService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a project (status defaults to TODO)',
  })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ status: 201, description: 'Project created.' })
  @ApiResponse({ status: 404, description: 'USER_NOT_FOUND' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all projects, newest first' })
  @ApiResponse({ status: 200, description: 'Non-deleted projects.' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id/form-data')
  @ApiOperation({
    summary:
      'Get consolidated Contact, passport, employment, and Company form data',
  })
  @ApiParam(PROJECT_ID_PARAM)
  @ApiResponse({
    status: 200,
    description: 'Project form preparation data and structured missing fields.',
  })
  formDataForProject(@Param('id') id: string) {
    return this.formData.findForProject(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one project' })
  @ApiParam(PROJECT_ID_PARAM)
  @ApiResponse({ status: 200, description: 'Project found.' })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a project',
    description:
      'title/description/contactId/dueDate/status are all plain field updates. Status is a simple free-form field (TODO/DOING/DONE/CANCELLED) with no transition rules enforced.',
  })
  @ApiParam(PROJECT_ID_PARAM)
  @ApiBody({ type: UpdateProjectDto })
  @ApiResponse({ status: 200, description: 'Project updated.' })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft-delete a project',
    description:
      'Sets deleted_at and deleted_by. Does not remove tasks, documents, or timeline rows.',
  })
  @ApiParam(PROJECT_ID_PARAM)
  @ApiBody({ type: RemoveProjectDto })
  @ApiResponse({ status: 204, description: 'Project soft-deleted.' })
  @ApiResponse({
    status: 404,
    description: 'PROJECT_NOT_FOUND or USER_NOT_FOUND (deletedById).',
  })
  remove(@Param('id') id: string, @Body() dto: RemoveProjectDto) {
    return this.projectsService.remove(id, dto);
  }
}
