import { Injectable, Logger } from '@nestjs/common'
import { type GitHubStats } from './github-stats.types'
import { config } from '@/common/config'
import { GitHubService } from '@/providers/github/github.service'

const OWNER = 'oryweave'
const REPO = 'oriweave'
const TTL_MS = 30 * 60 * 1000
// Floor between fetch attempts while GitHub is unreachable/rate-limited, so an outage doesn't
// turn every incoming request into an outbound GitHub call.
const RETRY_BACKOFF_MS = 60 * 1000

@Injectable()
class GitHubStatsService {
  private readonly logger = new Logger(GitHubStatsService.name)
  private cachedStats: GitHubStats | null = null
  private cachedAt: number | null = null
  private lastAttemptAt: number | null = null

  constructor(private readonly githubService: GitHubService) {}

  async getStats(now = Date.now()): Promise<GitHubStats> {
    if (this.cachedAt !== null && now - this.cachedAt < TTL_MS) {
      return this.cachedStats as GitHubStats
    }

    if (this.lastAttemptAt !== null && now - this.lastAttemptAt < RETRY_BACKOFF_MS) {
      return this.cachedStats ?? { stars: null, forks: null }
    }

    this.lastAttemptAt = now

    try {
      const token = config().github.statsToken
      if (!token) {
        this.logger.warn(
          'GITHUB_STATS_TOKEN not set — calling GitHub unauthenticated (60/hr limit)',
        )
      }

      const repo = await this.githubService.getRepo(OWNER, REPO, token || undefined)
      const stats: GitHubStats = { stars: repo.stargazers_count, forks: repo.forks_count }

      this.cachedStats = stats
      this.cachedAt = now
      return stats
    } catch (err) {
      this.logger.warn(`Failed to refresh GitHub stats, serving last-known-good: ${err}`)
      return this.cachedStats ?? { stars: null, forks: null }
    }
  }
}

export { GitHubStatsService, TTL_MS, RETRY_BACKOFF_MS }
