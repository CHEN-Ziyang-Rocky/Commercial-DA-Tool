// src/modules/company/company.entity.ts
import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
  } from 'typeorm';
  
  /**
   * Company 实体：
   *  - companyCode 为主键（来自 CSV）
   *  - 自关联：parentCompany <—> children
   */
  @Entity({ name: 'companies' })
  export class Company {
    @PrimaryColumn({ name: 'company_code', type: 'varchar', length: 10 })
    companyCode: string;
  
    @Column({ name: 'company_name', type: 'varchar', length: 255 })
    companyName: string;
  
    @Column({ type: 'tinyint', unsigned: true })
    level: number;
  
    @Column({ type: 'varchar', length: 100 })
    country: string;
  
    @Column({ type: 'varchar', length: 100 })
    city: string;
  
    @Column({ name: 'founded_year', type: 'int', unsigned: true })
    foundedYear: number;
  
    @Column({ name: 'annual_revenue', type: 'bigint', unsigned: true })
    annualRevenue: number;
  
    @Column({ type: 'int', unsigned: true })
    employees: number;
  
    /** ------------- 自关联 ------------- */
    @ManyToOne(() => Company, (c) => c.children, { nullable: true })
    @JoinColumn({ name: 'parent_company' })
    parentCompany?: Company;
  
    @OneToMany(() => Company, (c) => c.parentCompany)
    children: Company[];
  }
  