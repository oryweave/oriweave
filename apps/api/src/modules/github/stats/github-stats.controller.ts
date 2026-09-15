import { Controller, Get } from '@nestjs/common'
import { GitHubStatsService } from './github-stats.service'

@Controller('github')
class GitHubStatsController {
  constructor(private readonly githubStatsService: GitHubStatsService) {}

  @Get('stats')
  async getStats() {
    return this.githubStatsService.getStats()
  }
}

export { GitHubStatsController }
