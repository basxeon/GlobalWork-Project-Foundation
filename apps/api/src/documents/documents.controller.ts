import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';
import { contentDisposition } from './filename';
import { RemoveDocumentDto } from './dto/remove-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const uploadInterceptor = () =>
  FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES },
  });

@ApiTags('Documents')
@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('projects/:projectId/documents')
  @UseInterceptors(uploadInterceptor())
  @ApiOperation({
    summary: 'Upload a document to a project (creates version 1)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        uploadedById: { type: 'string', format: 'uuid' },
      },
      required: ['file', 'uploadedById'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document created.' })
  @ApiResponse({
    status: 404,
    description: 'PROJECT_NOT_FOUND or USER_NOT_FOUND.',
  })
  upload(
    @Param('projectId') projectId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documents.upload(projectId, dto.uploadedById, file);
  }

  @Get('projects/:projectId/documents')
  @ApiOperation({ summary: 'List documents for a project' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Non-deleted documents, newest first.',
  })
  findAllForCase(@Param('projectId') projectId: string) {
    return this.documents.findAllForCase(projectId);
  }

  @Get('documents')
  @ApiOperation({
    summary: 'List all non-deleted documents with Project metadata',
  })
  findAllGlobal() {
    return this.documents.findAllGlobal();
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get one document' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Document found.' })
  @ApiResponse({ status: 404, description: 'DOCUMENT_NOT_FOUND' })
  findOne(@Param('id') id: string) {
    return this.documents.findOne(id);
  }

  @Patch('documents/:id')
  @ApiOperation({ summary: 'Update document display name or category' })
  updateMetadata(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documents.updateMetadata(id, dto.displayName, dto.category);
  }

  @Get('documents/:id/versions')
  @ApiOperation({ summary: "List a document's version history, newest first" })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Version history.' })
  @ApiResponse({ status: 404, description: 'DOCUMENT_NOT_FOUND' })
  listVersions(@Param('id') id: string) {
    return this.documents.listVersions(id);
  }

  @Post('documents/:id/versions')
  @UseInterceptors(uploadInterceptor())
  @ApiOperation({ summary: 'Upload a new version of an existing document' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        uploadedById: { type: 'string', format: 'uuid' },
      },
      required: ['file', 'uploadedById'],
    },
  })
  @ApiResponse({ status: 201, description: 'New version created.' })
  @ApiResponse({
    status: 404,
    description: 'DOCUMENT_NOT_FOUND or USER_NOT_FOUND.',
  })
  uploadVersion(
    @Param('id') id: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documents.uploadVersion(id, dto.uploadedById, file);
  }

  @Get('documents/:id/download')
  @ApiOperation({
    summary: 'Download or preview a document',
    description:
      'Returns the current version by default, or a specific version via ?version=.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'File content, correct Content-Type set.',
  })
  @ApiResponse({
    status: 404,
    description: 'DOCUMENT_NOT_FOUND or DOCUMENT_VERSION_NOT_FOUND.',
  })
  async download(
    @Param('id') id: string,
    @Query('version') version: string | undefined,
    @Res() res: Response,
  ) {
    const versionNumber = version === undefined ? undefined : Number(version);
    const { buffer, mediaType, filename } =
      await this.documents.getFileForDownload(id, versionNumber);
    res.setHeader('Content-Type', mediaType);
    res.setHeader(
      'Content-Disposition',
      contentDisposition('inline', filename),
    );
    res.send(buffer);
  }

  @Get('documents/:id/preview')
  @ApiOperation({ summary: 'Preview a supported PDF or image inline' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Inline PDF, PNG, JPEG, or WebP.' })
  @ApiResponse({ status: 400, description: 'UNSUPPORTED_DOCUMENT_TYPE' })
  @ApiResponse({ status: 404, description: 'DOCUMENT_NOT_FOUND' })
  async preview(@Param('id') id: string, @Res() res: Response) {
    const { buffer, mediaType, filename } =
      await this.documents.getFileForPreview(id);
    res.setHeader('Content-Type', mediaType);
    res.setHeader(
      'Content-Disposition',
      contentDisposition('inline', filename),
    );
    res.send(buffer);
  }

  @Delete('documents/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a document' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: RemoveDocumentDto })
  @ApiResponse({ status: 204, description: 'Document soft-deleted.' })
  @ApiResponse({
    status: 404,
    description: 'DOCUMENT_NOT_FOUND or USER_NOT_FOUND.',
  })
  remove(@Param('id') id: string, @Body() dto: RemoveDocumentDto) {
    return this.documents.remove(id, dto.deletedById);
  }
}
