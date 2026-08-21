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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { RemoveContactDto } from './dto/remove-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

const CONTACT_ID_PARAM = { name: 'id', format: 'uuid' as const };

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a contact' })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({ status: 201, description: 'Contact created.' })
  create(@Body() dto: CreateContactDto) {
    return this.contacts.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all contacts' })
  @ApiResponse({ status: 200, description: 'Non-deleted contacts, by name.' })
  findAll() {
    return this.contacts.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one contact' })
  @ApiParam(CONTACT_ID_PARAM)
  @ApiResponse({ status: 200, description: 'Contact found.' })
  @ApiResponse({ status: 404, description: 'CONTACT_NOT_FOUND' })
  findOne(@Param('id') id: string) {
    return this.contacts.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam(CONTACT_ID_PARAM)
  @ApiBody({ type: UpdateContactDto })
  @ApiResponse({ status: 200, description: 'Contact updated.' })
  @ApiResponse({ status: 404, description: 'CONTACT_NOT_FOUND' })
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contacts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a contact' })
  @ApiParam(CONTACT_ID_PARAM)
  @ApiBody({ type: RemoveContactDto })
  @ApiResponse({ status: 204, description: 'Contact soft-deleted.' })
  @ApiResponse({
    status: 409,
    description:
      'CONTACT_IN_USE when an active project references the contact.',
  })
  @ApiResponse({
    status: 404,
    description: 'CONTACT_NOT_FOUND or USER_NOT_FOUND.',
  })
  remove(@Param('id') id: string, @Body() dto: RemoveContactDto) {
    return this.contacts.remove(id, dto.deletedById);
  }
}
