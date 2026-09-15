import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
  IsNumberString,
} from 'class-validator'
import { GallerySort, Visibility } from '@/common/utils/enums'

class CreateConfigDto {
  @IsString()
  @IsNotEmpty()
  yaml!: string

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility
}

class ListConfigsQueryDto {
  @IsOptional()
  @IsEnum(GallerySort)
  sort?: GallerySort

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tag?: string

  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string

  @IsOptional()
  @IsNumberString()
  page?: string

  @IsOptional()
  @IsNumberString()
  limit?: string
}

class UpdateConfigDto {
  @IsString()
  @IsNotEmpty()
  yaml!: string

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility
}

class ListMyConfigsQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string

  @IsOptional()
  @IsNumberString()
  limit?: string
}

export { CreateConfigDto, ListConfigsQueryDto, ListMyConfigsQueryDto, UpdateConfigDto }
