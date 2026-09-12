import { createHash } from 'crypto'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { FindOptionsWhere, IsNull, Repository } from 'typeorm'
import type { HomelabDocument } from '@oriweave/core'
import { Config } from './configs.entity'
import { ConfigTag } from './config-tag.entity'
import { CreateConfigDto, UpdateConfigDto } from './configs.dto'
import { GallerySort, Visibility } from '@/common/utils/enums'

@Injectable()
export class ConfigsService {
  constructor(
    @InjectRepository(Config) private readonly configRepo: Repository<Config>,
    @InjectRepository(ConfigTag) private readonly tagRepo: Repository<ConfigTag>,
  ) {}

  private async generateSlug(): Promise<string> {
    const { nanoid } = await import('nanoid')
    return nanoid(8)
  }

  private hashContent(yaml: string): string {
    return createHash('sha256').update(yaml.trim()).digest('hex')
  }

  async create(
    dto: CreateConfigDto & { _parsed?: HomelabDocument },
    userId?: string | null,
  ): Promise<Config> {
    const contentHash = this.hashContent(dto.yaml)

    const where: FindOptionsWhere<Config> = {
      contentHash,
      userId: userId ?? IsNull(),
    }

    const existing = await this.configRepo.findOne({
      where,
      relations: ['tags', 'user'],
    })

    if (existing) {
      return existing
    }

    const slug = await this.generateSlug()
    const parsed = dto._parsed
    const title = parsed?.meta?.title || 'Untitled'
    const metaTags = parsed?.meta?.tags || []

    const config = this.configRepo.create({
      slug,
      title,
      yaml: dto.yaml,
      visibility: dto.visibility || Visibility.UNLISTED,
      contentHash,
      userId: userId || null,
    })

    const saved = await this.configRepo.save(config)

    if (metaTags.length > 0) {
      const tagEntities = metaTags.map((tag) => this.tagRepo.create({ configId: saved.id, tag }))
      await this.tagRepo.save(tagEntities)
    }

    return this.configRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['tags', 'user'],
    })
  }

  async fork(slug: string, userId?: string | null): Promise<Config> {
    const original = await this.findBySlug(slug)

    const newSlug = await this.generateSlug()
    const forked = this.configRepo.create({
      slug: newSlug,
      title: `${original.title} (fork)`,
      yaml: original.yaml,
      visibility: Visibility.UNLISTED,
      forkOf: original.slug,
      contentHash: null,
      userId: userId || null,
    })

    const saved = await this.configRepo.save(forked)

    if (original.tags && original.tags.length > 0) {
      const tagEntities = original.tags.map((t) =>
        this.tagRepo.create({ configId: saved.id, tag: t.tag }),
      )
      await this.tagRepo.save(tagEntities)
    }

    this.configRepo.increment({ id: original.id }, 'forkCount', 1).catch(() => {})

    return this.configRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['tags', 'user'],
    })
  }

  async findBySlug(slug: string): Promise<Config> {
    const config = await this.configRepo.findOne({
      where: { slug },
      relations: ['tags', 'user'],
    })

    if (!config) {
      throw new NotFoundException(`Config with slug '${slug}' not found`)
    }

    this.configRepo.increment({ id: config.id }, 'viewCount', 1).catch(() => {})

    return config
  }

  async findPublic(page = 1, limit = 20): Promise<{ data: Config[]; total: number }> {
    const [data, total] = await this.configRepo.findAndCount({
      where: { visibility: Visibility.PUBLIC },
      relations: ['tags', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return { data, total }
  }

  async findGallery(params: {
    page?: number
    limit?: number
    sort?: GallerySort
    tag?: string
    search?: string
    visibility?: Visibility
  }): Promise<{ data: Config[]; total: number }> {
    const page = params.page ?? 1
    const limit = params.limit ?? 20
    const sort = params.sort ?? GallerySort.RECENT
    const visibility = params.visibility ?? Visibility.PUBLIC

    const qb = this.configRepo
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.tags', 'tags')
      .leftJoinAndSelect('config.user', 'user')
      .where('config.visibility = :visibility', { visibility })
      .andWhere('config.isTemplate = :isTemplate', { isTemplate: false })

    if (params.tag) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM config_tags ct WHERE ct.config_id = config.id AND ct.tag = :tag)',
        { tag: params.tag },
      )
    }

    if (params.search) {
      qb.andWhere('LOWER(config.title) LIKE LOWER(:search)', {
        search: `%${params.search}%`,
      })
    }

    switch (sort) {
      case GallerySort.POPULAR:
        qb.orderBy('config.viewCount', 'DESC').addOrderBy('config.createdAt', 'DESC')
        break
      case GallerySort.MOST_FORKED:
        qb.orderBy('config.forkCount', 'DESC').addOrderBy('config.createdAt', 'DESC')
        break
      case GallerySort.RECENT:
      default:
        qb.orderBy('config.createdAt', 'DESC')
        break
    }

    qb.skip((page - 1) * limit).take(limit)

    const [data, total] = await qb.getManyAndCount()
    return { data, total }
  }

  async findByUserId(userId: string): Promise<Config[]> {
    return this.configRepo.find({
      where: { userId },
      relations: ['tags'],
      order: { updatedAt: 'DESC' },
    })
  }

  async update(
    slug: string,
    dto: UpdateConfigDto & { _parsed?: HomelabDocument },
  ): Promise<Config> {
    const config = await this.findBySlug(slug)
    const parsed = dto._parsed

    config.yaml = dto.yaml
    config.title = parsed?.meta?.title || config.title
    config.contentHash = this.hashContent(dto.yaml)

    if (dto.visibility) {
      config.visibility = dto.visibility as Visibility
    }

    // Update tags
    if (parsed?.meta?.tags) {
      await this.tagRepo.delete({ configId: config.id })
      const tagEntities = parsed.meta.tags.map((tag) =>
        this.tagRepo.create({ configId: config.id, tag }),
      )
      await this.tagRepo.save(tagEntities)
    }

    await this.configRepo.save(config)

    return this.configRepo.findOneOrFail({
      where: { id: config.id },
      relations: ['tags', 'user'],
    })
  }

  async remove(slug: string): Promise<void> {
    const config = await this.findBySlug(slug)
    const parentSlug = config.forkOf
    await this.configRepo.remove(config)

    if (parentSlug) {
      this.configRepo.decrement({ slug: parentSlug }, 'forkCount', 1).catch(() => {})
    }
  }
}
