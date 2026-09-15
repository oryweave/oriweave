import { describe, expect, it, vi } from 'vitest'
import {
  GitHubStatsService,
  RETRY_BACKOFF_MS,
  TTL_MS,
} from '@/modules/github/stats/github-stats.service'
import { type GitHubService } from '@/providers/github/github.service'

function fakeGithubService(getRepo: GitHubService['getRepo']): GitHubService {
  return { getRepo } as GitHubService
}

function repo(stars: number, forks: number) {
  return { stargazers_count: stars, forks_count: forks }
}

describe('GitHubStatsService', () => {
  it('fetches on a cold cache and returns the parsed stats', async () => {
    const getRepo = vi.fn().mockResolvedValue(repo(10, 2))
    const service = new GitHubStatsService(fakeGithubService(getRepo))

    const stats = await service.getStats(0)

    expect(stats).toEqual({ stars: 10, forks: 2 })
    expect(getRepo).toHaveBeenCalledTimes(1)
  })

  it('serves the cache without refetching while within TTL', async () => {
    const getRepo = vi.fn().mockResolvedValue(repo(10, 2))
    const service = new GitHubStatsService(fakeGithubService(getRepo))

    await service.getStats(0)
    const stats = await service.getStats(TTL_MS - 1)

    expect(stats).toEqual({ stars: 10, forks: 2 })
    expect(getRepo).toHaveBeenCalledTimes(1)
  })

  it('refetches once the TTL has expired', async () => {
    const getRepo = vi.fn().mockResolvedValueOnce(repo(10, 2)).mockResolvedValueOnce(repo(15, 3))
    const service = new GitHubStatsService(fakeGithubService(getRepo))

    await service.getStats(0)
    const stats = await service.getStats(TTL_MS + 1)

    expect(stats).toEqual({ stars: 15, forks: 3 })
    expect(getRepo).toHaveBeenCalledTimes(2)
  })

  it('falls back to null stats when GitHub fails and there is no prior cache', async () => {
    const getRepo = vi.fn().mockRejectedValue(new Error('GitHub API responded 500'))
    const service = new GitHubStatsService(fakeGithubService(getRepo))

    const stats = await service.getStats(0)

    expect(stats).toEqual({ stars: null, forks: null })
  })

  it('serves last-known-good when GitHub fails after a prior success', async () => {
    const getRepo = vi
      .fn()
      .mockResolvedValueOnce(repo(10, 2))
      .mockRejectedValueOnce(new Error('GitHub API responded 503'))
    const service = new GitHubStatsService(fakeGithubService(getRepo))

    await service.getStats(0)
    const stats = await service.getStats(TTL_MS + 1)

    expect(stats).toEqual({ stars: 10, forks: 2 })
  })

  it('never throws when the provider itself rejects (host unreachable)', async () => {
    const getRepo = vi.fn().mockRejectedValue(new Error('ENOTFOUND'))
    const service = new GitHubStatsService(fakeGithubService(getRepo))

    await expect(service.getStats(0)).resolves.toEqual({ stars: null, forks: null })
  })

  it('does not hammer GitHub during an outage — backs off between failed attempts', async () => {
    const getRepo = vi.fn().mockRejectedValue(new Error('GitHub API responded 500'))
    const service = new GitHubStatsService(fakeGithubService(getRepo))

    await service.getStats(0)
    await service.getStats(1)
    await service.getStats(RETRY_BACKOFF_MS - 1)

    expect(getRepo).toHaveBeenCalledTimes(1)

    await service.getStats(RETRY_BACKOFF_MS + 1)
    expect(getRepo).toHaveBeenCalledTimes(2)
  })
})
