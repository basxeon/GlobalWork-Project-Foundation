import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('attention')
  @ApiOperation({ summary: 'Get current passport and task attention items' })
  @ApiResponse({
    status: 200,
    description: 'Computed current attention summary and compact lists.',
  })
  attention() {
    return this.dashboard.attention();
  }
}
