import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}
  @Get() @ApiOperation({ summary: 'List active companies' }) findAll() {
    return this.companies.findAll();
  }
  @Post()
  @ApiOperation({ summary: 'Create a company for form preparation' })
  @ApiBody({ type: CreateCompanyDto })
  @ApiResponse({ status: 201, description: 'Company created.' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companies.create(dto);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update company form data' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateCompanyDto })
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(id, dto);
  }
}
