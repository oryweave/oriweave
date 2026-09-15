import { Module } from '@nestjs/common'
import { GitHubStatsController } from './github-stats.controller'
import { GitHubStatsService } from './github-stats.service'
import { GitHubModule } from '@/providers/github/github.module'

@Module({
  imports: [GitHubModule],
  controllers: [GitHubStatsController],
  providers: [GitHubStatsService],
})
class GitHubStatsModule {}

export { GitHubStatsModule }
