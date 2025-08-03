// src/modules/company/dto/search-company.dto.ts
import {
    IsIn,
    IsOptional,
    IsArray,
    ArrayMaxSize,
    ValidateNested,
    IsInt,
    Min,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  export class RangeNumberDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    start?: number;
  
    @IsOptional()
    @IsInt()
    @Min(0)
    end?: number;
  }
  
  export class MinMaxDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    min?: number;
  
    @IsOptional()
    @IsInt()
    @Min(0)
    max?: number;
  }
  
  export class FilterDto {
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    level?: number[];
  
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(50)
    country?: string[];
  
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(50)
    city?: string[];
  
    @IsOptional()
    @ValidateNested()
    @Type(() => RangeNumberDto)
    founded_year?: RangeNumberDto;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => MinMaxDto)
    annual_revenue?: MinMaxDto;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => MinMaxDto)
    employees?: MinMaxDto;
  }
  
  export class SearchCompanyDto {
    @IsIn(['level', 'country', 'city'])
    dimension: 'level' | 'country' | 'city';
  
    @IsOptional()
    @ValidateNested()
    @Type(() => FilterDto)
    filter?: FilterDto;
  }
  