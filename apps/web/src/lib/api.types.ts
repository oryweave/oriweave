interface Author {
  username: string
  avatarUrl: string | null
}

interface SharedConfig {
  slug: string
  title: string
  yaml: string
  visibility: string
  viewCount: number
  forkOf: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  author: Author | null
}

interface CreateConfigResponse {
  slug: string
  title: string
  url: string
}

interface User {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface MyConfig {
  slug: string
  title: string
  visibility: string
  viewCount: number
  tags: { tag: string }[]
  createdAt: string
  updatedAt: string
}

interface MyConfigListResponse {
  data: MyConfig[]
  total: number
}

type TemplateCategory =
  | 'networking'
  | 'media'
  | 'virtualization'
  | 'storage'
  | 'monitoring'
  | 'home-automation'
  | 'general'

interface TemplateSummary {
  slug: string
  title: string
  category: TemplateCategory | null
  viewCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface TemplateDetail extends TemplateSummary {
  yaml: string
}

interface TemplatesListResponse {
  data: TemplateSummary[]
  total: number
}

type GallerySort = 'recent' | 'popular' | 'most_forked'

interface GallerySummary {
  slug: string
  title: string
  viewCount: number
  forkCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
  author: Author | null
}

interface GalleryListResponse {
  data: GallerySummary[]
  total: number
}

interface GalleryQuery {
  sort?: GallerySort
  tag?: string
  search?: string
  page?: number
  limit?: number
}

interface GithubStats {
  stars: number | null
  forks: number | null
}

export {
  SharedConfig,
  CreateConfigResponse,
  User,
  MyConfig,
  MyConfigListResponse,
  TemplateCategory,
  TemplateSummary,
  TemplateDetail,
  TemplatesListResponse,
  GallerySummary,
  GalleryListResponse,
  GalleryQuery,
  GallerySort,
  GithubStats,
}
