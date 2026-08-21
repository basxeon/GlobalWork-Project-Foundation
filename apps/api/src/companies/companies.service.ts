import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company) private readonly companies: Repository<Company>,
  ) {}

  create(dto: CreateCompanyDto) {
    return this.companies.save({ ...dto, deletedAt: null, deletedBy: null });
  }
  findAll() {
    return this.companies.find({
      where: { deletedAt: IsNull() },
      order: { legalNameEn: 'ASC', legalNameTh: 'ASC' },
    });
  }
  async findOne(id: string) {
    const company = await this.companies.findOneBy({ id, deletedAt: IsNull() });
    if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
    return company;
  }
  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.companies.save(company);
  }
}
