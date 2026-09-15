import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common'
import type { Request } from 'express'
import { ConfigsService } from './configs.service'
import {
  CreateConfigDto,
  ListConfigsQueryDto,
  ListMyConfigsQueryDto,
  UpdateConfigDto,
} from './configs.dto'
import { AuthGuard } from '@/modules/auth/auth.guard'
import { OptionalAuthGuard } from '@/modules/auth/auth-optional.guard'
import { YamlValidationPipe } from '@/common/pipes/yaml-validation.pipe'

@Controller('configs')
export class ConfigsController {
  constructor(private readonly configsService: ConfigsService) {}

  @Post()
  @UseGuards(OptionalAuthGuard)
  async create(@Body(YamlValidationPipe) dto: CreateConfigDto, @Req() request: Request) {
    const user = request.user
    const config = await this.configsService.create(dto, user?.id)
    return {
      slug: config.slug,
      title: config.title,
      url: `/s/${config.slug}`,
    }
  }

  @Post(':slug/fork')
  @UseGuards(OptionalAuthGuard)
  async fork(@Param('slug') slug: string, @Req() request: Request) {
    const user = request.user
    const config = await this.configsService.fork(slug, user?.id)
    return {
      slug: config.slug,
      title: config.title,
      url: `/s/${config.slug}`,
    }
  }

  @Get('user/me')
  @UseGuards(AuthGuard)
  async myConfigs(@Query() query: ListMyConfigsQueryDto, @Req() request: Request) {
    const user = request.user
    if (!user) {
      throw new ForbiddenException()
    }

    const page = Math.max(1, parseInt(query.page || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)))

    const { data, total } = await this.configsService.findByUserId(user.id, { page, limit })

    return {
      data: data.map((config) => ({
        slug: config.slug,
        title: config.title,
        visibility: config.visibility,
        viewCount: config.viewCount,
        tags: config.tags.map((t) => ({ tag: t.tag })),
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      })),
      total,
    }
  }

  @Get()
  async findAll(@Query() query: ListConfigsQueryDto) {
    const page = Math.max(1, parseInt(query.page || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)))

    const { data, total } = await this.configsService.findGallery({
      page,
      limit,
      sort: query.sort,
      tag: query.tag,
      search: query.search,
    })

    return {
      data: data.map((config) => ({
        slug: config.slug,
        title: config.title,
        viewCount: config.viewCount,
        forkCount: config.forkCount,
        tags: config.tags.map((t) => t.tag),
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
        author: config.user
          ? { username: config.user.username, avatarUrl: config.user.avatarUrl }
          : null,
      })),
      total,
    }
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const config = await this.configsService.findBySlug(slug)
    return {
      slug: config.slug,
      title: config.title,
      yaml: config.yaml,
      visibility: config.visibility,
      viewCount: config.viewCount,
      forkOf: config.forkOf,
      tags: config.tags.map((t) => t.tag),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      author: config.user
        ? { username: config.user.username, avatarUrl: config.user.avatarUrl }
        : null,
    }
  }

  @Patch(':slug')
  @UseGuards(AuthGuard)
  async update(
    @Param('slug') slug: string,
    @Body(YamlValidationPipe) dto: UpdateConfigDto,
    @Req() request: Request,
  ) {
    const user = request.user
    if (!user) {
      throw new ForbiddenException()
    }

    const config = await this.configsService.findBySlug(slug)

    if (config.userId && config.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own configs')
    }

    const updated = await this.configsService.update(slug, dto)
    return {
      slug: updated.slug,
      title: updated.title,
      url: `/s/${updated.slug}`,
    }
  }

  @Delete(':slug')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('slug') slug: string, @Req() request: Request) {
    const user = request.user
    if (!user) {
      throw new ForbiddenException()
    }

    const config = await this.configsService.findBySlug(slug)
    if (config.userId && config.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own configs')
    }

    await this.configsService.remove(slug)
  }
}
