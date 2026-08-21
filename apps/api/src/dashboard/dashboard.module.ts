import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../contacts/entities/contact.entity';
import { Task } from '../tasks/entities/task.entity';
import { ApplicationSetting } from '../settings/entities/application-setting.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Task, ApplicationSetting])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
