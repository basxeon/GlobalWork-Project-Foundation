import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from '../contacts/entities/contact.entity';
import { DocumentsModule } from '../documents/documents.module';
import { Document } from '../documents/entities/document.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { PassportExtractionsController } from './passport-extractions.controller';
import { PassportExtraction } from './entities/passport-extraction.entity';
import { PassportExtractionsService } from './passport-extractions.service';
import { PassportOcrService } from './passport-ocr.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PassportExtraction,
      Document,
      Project,
      Contact,
      User,
    ]),
    DocumentsModule,
  ],
  controllers: [PassportExtractionsController],
  providers: [PassportExtractionsService, PassportOcrService],
})
export class PassportExtractionsModule {}
