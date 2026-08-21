import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Project } from './entities/project.entity';
import { TimelineEvent } from './entities/timeline.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectFormDataService } from './project-form-data.service';
import { TimelineService } from './timeline.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, TimelineEvent, Contact, Company]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, TimelineService, ProjectFormDataService],
})
export class ProjectsModule {}
