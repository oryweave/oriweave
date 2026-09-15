import {
  CreateConfigResponse,
  GalleryListResponse,
  GalleryQuery,
  GithubStats,
  MyConfigListResponse,
  SharedConfig,
  TemplateCategory,
  TemplateDetail,
  TemplatesListResponse,
  User,
} from './api.types'

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly isNetwork: boolean,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const AUTH_INVALIDATED = 'auth:invalidated'
const API_BASE = import.meta.env.VITE_API_URL || 'http://oriweave.localhost:8087'
const defaultInit: RequestInit = { credentials: 'include' }

async function failedResponse(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}))
  throw new ApiError(body.message || `${fallback} (${response.status})`, response.status, false)
}

function loginUrl(): string {
  return `${API_BASE}/auth/github`
}

function notifyAuthInvalidated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_INVALIDATED))
  }
}

async function createConfig(
  yaml: string,
  visibility: 'public' | 'unlisted' = 'unlisted',
): Promise<CreateConfigResponse> {
  const response = await fetch(`${API_BASE}/configs`, {
    ...defaultInit,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ yaml, visibility }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Failed to create config (${response.status})`)
  }

  return response.json()
}

async function forkConfig(slug: string): Promise<CreateConfigResponse> {
  const response = await fetch(`${API_BASE}/configs/${slug}/fork`, {
    ...defaultInit,
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Failed to fork config (${response.status})`)
  }

  return response.json()
}

async function createTemplateFromSlug(slug: string): Promise<CreateConfigResponse> {
  const response = await fetch(`${API_BASE}/templates/${slug}/use`, {
    ...defaultInit,
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Failed to use template (${response.status})`)
  }

  return response.json()
}

async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { ...defaultInit, method: 'POST' })
}

async function fetchMe(): Promise<User | null> {
  const response = await fetch(`${API_BASE}/auth/me`, defaultInit)

  if (response.status === 401) return null
  if (!response.ok) {
    throw new Error(`Failed to fetch user (${response.status})`)
  }

  return response.json()
}

async function fetchConfig(slug: string): Promise<SharedConfig> {
  const response = await fetch(`${API_BASE}/configs/${slug}`, defaultInit)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Config not found')
    }
    throw new Error(`Failed to fetch config (${response.status})`)
  }

  return response.json()
}

async function fetchMyConfigs(page = 1, limit = 20): Promise<MyConfigListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })

  try {
    const response = await fetch(`${API_BASE}/configs/user/me?${params.toString()}`, defaultInit)

    if (!response.ok) {
      if (response.status === 401) {
        notifyAuthInvalidated()
        throw new ApiError('Not authenticated', 401, false)
      }
      return failedResponse(response, 'Failed to load configs')
    }

    return response.json()
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(err instanceof Error ? err.message : 'Network error', null, true)
  }
}

async function fetchTemplates(
  category?: TemplateCategory,
  page = 1,
  limit = 20,
): Promise<TemplatesListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })

  if (category) params.set('category', category)

  try {
    const response = await fetch(`${API_BASE}/templates?${params.toString()}`, defaultInit)

    if (!response.ok) return failedResponse(response, 'Failed to load templates')

    return response.json()
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(err instanceof Error ? err.message : 'Network error', null, true)
  }
}

async function fetchTemplate(slug: string): Promise<TemplateDetail> {
  const response = await fetch(`${API_BASE}/templates/${slug}`, defaultInit)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Template not found')
    }
    throw new Error(`Failed to fetch template (${response.status})`)
  }

  return response.json()
}

async function fetchGallery(query: GalleryQuery = {}): Promise<GalleryListResponse> {
  const params = new URLSearchParams()
  params.set('page', String(query.page ?? 1))
  params.set('limit', String(query.limit ?? 20))
  if (query.sort) params.set('sort', query.sort)
  if (query.tag) params.set('tag', query.tag)
  if (query.search) params.set('search', query.search)

  try {
    const response = await fetch(`${API_BASE}/configs?${params.toString()}`, defaultInit)

    if (!response.ok) return failedResponse(response, 'Failed to load gallery')

    return response.json()
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(err instanceof Error ? err.message : 'Network error', null, true)
  }
}

async function updateConfig(
  slug: string,
  yaml: string,
  visibility?: 'public' | 'unlisted',
): Promise<CreateConfigResponse> {
  const body: Record<string, unknown> = { yaml }
  if (visibility) body.visibility = visibility

  const response = await fetch(`${API_BASE}/configs/${slug}`, {
    ...defaultInit,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 401) notifyAuthInvalidated()
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Failed to update config (${response.status})`)
  }

  return response.json()
}

async function deleteConfig(slug: string): Promise<void> {
  const response = await fetch(`${API_BASE}/configs/${slug}`, {
    ...defaultInit,
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 204) {
    if (response.status === 401) notifyAuthInvalidated()
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Failed to delete config (${response.status})`)
  }
}

// Never throws — the nav badge falls back to the plain icon on any failure, so a network
// error here should look identical to the endpoint's own graceful { stars: null, forks: null }.
async function fetchGithubStats(): Promise<GithubStats | null> {
  try {
    const response = await fetch(`${API_BASE}/github/stats`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export {
  AUTH_INVALIDATED,
  ApiError,
  loginUrl,
  createConfig,
  forkConfig,
  createTemplateFromSlug,
  logout,
  fetchMe,
  fetchConfig,
  fetchMyConfigs,
  fetchTemplates,
  fetchTemplate,
  fetchGallery,
  updateConfig,
  deleteConfig,
  fetchGithubStats,
}
