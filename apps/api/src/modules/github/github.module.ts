import { Module } from '@nestjs/common'
import { GitHubStatsModule } from './stats/github-stats.module'

// Umbrella for everything we build on top of GitHub data — stats today, repos/issues/whatever
// next. Each resource is its own self-contained sub-module (own controller, service, routes);
// this just aggregates them so app.module.ts has one import to make, not one per resource.
@Module({
  imports: [GitHubStatsModule],
})
class GitHubFeatureModule {}

export { GitHubFeatureModule }
