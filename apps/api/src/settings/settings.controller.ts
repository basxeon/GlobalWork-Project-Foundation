import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../auth/public.decorator';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('general')
  @ApiOperation({ summary: 'Get workspace display settings' })
  getGeneral() {
    return this.settings.getGeneral();
  }

  @AdminOnly()
  @Patch('general')
  @ApiOperation({ summary: 'Update workspace display settings (Admin only)' })
  updateGeneral(@Body() dto: UpdateGeneralSettingsDto) {
    return this.settings.updateGeneral(dto);
  }

  @AdminOnly()
  @Get('storage-status')
  @ApiOperation({ summary: 'Get Local Drive storage status (Admin only)' })
  storageStatus() {
    return this.settings.storageStatus();
  }

  @AdminOnly()
  @Get('system-info')
  @ApiOperation({ summary: 'Get safe system health information (Admin only)' })
  systemInfo() {
    return this.settings.systemInfo();
  }
}
