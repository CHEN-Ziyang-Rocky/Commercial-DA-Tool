import {
    Inject,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, SelectQueryBuilder } from 'typeorm';
  import { Company } from './company.entity';
  import { SearchCompanyDto, FilterDto } from './dto/search-company.dto';
  
  @Injectable()
  export class CompanyService {
    constructor(
      @InjectRepository(Company)
      private readonly repo: Repository<Company>,
  
      @Inject(CACHE_MANAGER)
      private readonly cache: Cache,
    ) {}
  
    /* ---------- 通用 key ---------- */
    private key(...args: any[]) {
      return (
        'company:' +
        args
          .map((a) =>
            typeof a === 'string' ? a : encodeURIComponent(JSON.stringify(a)),
          )
          .join(':')
      );
    }
  
    /** 失效所有 Company 缓存 */
    async clearCompanyCache() {
      const keys = await (this.cache as any).store.keys('company:*');
      await Promise.all(keys.map((k: string) => this.cache.del(k)));
    }
  
    /* ---------- 查询 ---------- */
    async findAll() {
      const k = this.key('all');
      const cached = await this.cache.get<Company[]>(k);
      if (cached) return cached;
  
      const list = await this.repo.find();
      await this.cache.set(k, list, 300);
      return list;
    }
  
    async findCompany(code: string) {
      const k = this.key('id', code);
      const cached = await this.cache.get<Company>(k);
      if (cached) return cached;
  
      const company = await this.repo.findOne({ where: { companyCode: code } });
      if (!company) throw new NotFoundException(`Company ${code} not found`);
      await this.cache.set(k, company, 600);
      return company;
    }
  
    async search(dto: SearchCompanyDto) {
      const k = this.key('search', dto);
      const cached = await this.cache.get<any>(k);
      if (cached) return cached;
  
      const qb = this.repo.createQueryBuilder('c');
      this.applyFilters(qb, dto.filter);
  
      const rows = await qb
        .select([
          `c.${dto.dimension} AS dimension_value`,
          'JSON_ARRAYAGG(JSON_OBJECT(' +
            '"company_code", c.company_code,' +
            '"company_name", c.company_name,' +
            '"level", c.level,' +
            '"country", c.country,' +
            '"city", c.city,' +
            '"founded_year", c.founded_year,' +
            '"annual_revenue", c.annual_revenue,' +
            '"employees", c.employees' +
          ')) AS items',
        ])
        .groupBy(`c.${dto.dimension}`)
        .getRawMany<{ dimension_value: string; items: any }>();
  
      const data: Record<string, any[]> = {};
      rows.forEach((r) => {
        const items =
          typeof r.items === 'string' ? (JSON.parse(r.items) as any[]) : r.items;
        data[r.dimension_value] = items;
      });
  
      const result = {
        dimension: dto.dimension,
        data,
        ...(dto.filter ? { filter: dto.filter } : {}),
      };
  
      await this.cache.set(k, result, 300);
      return result;
    }
  
    /* ---------- 过滤拼装 ---------- */
    private applyFilters(qb: SelectQueryBuilder<Company>, f?: FilterDto) {
      if (!f) return;
      if (f.level?.length) qb.andWhere('c.level IN (:...lv)', { lv: f.level });
      if (f.country?.length) qb.andWhere('c.country IN (:...cty)', { cty: f.country });
      if (f.city?.length) qb.andWhere('c.city IN (:...city)', { city: f.city });
  
      if (f.founded_year?.start !== undefined)
        qb.andWhere('c.founded_year >= :fyS', { fyS: f.founded_year.start });
      if (f.founded_year?.end !== undefined)
        qb.andWhere('c.founded_year <= :fyE', { fyE: f.founded_year.end });
  
      if (f.annual_revenue?.min !== undefined)
        qb.andWhere('c.annual_revenue >= :revMin', { revMin: f.annual_revenue.min });
      if (f.annual_revenue?.max !== undefined)
        qb.andWhere('c.annual_revenue <= :revMax', { revMax: f.annual_revenue.max });
  
      if (f.employees?.min !== undefined)
        qb.andWhere('c.employees >= :empMin', { empMin: f.employees.min });
      if (f.employees?.max !== undefined)
        qb.andWhere('c.employees <= :empMax', { empMax: f.employees.max });
    }
  }
  