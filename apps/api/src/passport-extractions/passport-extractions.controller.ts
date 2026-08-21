import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';
import { ApplyPassportExtractionDto } from './dto/apply-passport-extraction.dto';
import { UpdatePassportExtractionDto } from './dto/update-passport-extraction.dto';
import { PassportExtractionsService } from './passport-extractions.service';

@ApiTags('Passport extraction')
@Controller('documents/:id/passport-extraction')
export class PassportExtractionsController {
  constructor(private readonly extractions: PassportExtractionsService) {}
  @Post()
  @ApiOperation({ summary: 'Run or rerun passport extraction' })
  @ApiParam({ name: 'id', format: 'uuid' })
  run(@Param('id') id: string) {
    return this.extractions.run(id);
  }
  @Get() @ApiOperation({ summary: 'Get passport extraction' }) get(
    @Param('id') id: string,
  ) {
    return this.extractions.findOne(id);
  }
  @Patch()
  @ApiBody({ type: UpdatePassportExtractionDto })
  @ApiOperation({ summary: 'Save reviewed passport fields' })
  update(@Param('id') id: string, @Body() dto: UpdatePassportExtractionDto) {
    return this.extractions.update(id, dto);
  }
  @Post('confirm')
  @ApiOperation({ summary: 'Confirm reviewed passport fields' })
  confirm(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.extractions.confirm(id, user.id);
  }
  @Post('apply')
  @ApiBody({ type: ApplyPassportExtractionDto })
  @ApiOperation({ summary: 'Apply confirmed fields to the linked Contact' })
  @ApiResponse({
    status: 409,
    description:
      'CONTACT_FIELD_CONFLICT; send overwrite=true after explicit review.',
  })
  apply(@Param('id') id: string, @Body() dto: ApplyPassportExtractionDto) {
    return this.extractions.apply(id, dto);
  }
}
