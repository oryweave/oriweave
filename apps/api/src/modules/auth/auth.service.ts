import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { JwtPayload } from './auth.types'
import { config } from '@/common/config'
import { GitHubService } from '@/providers/github/github.service'
import { UsersService } from '@/modules/users/user.service'
import type { User } from '@/modules/users/user.entity'

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly githubService: GitHubService,
  ) {}

  getGitHubAuthUrl(state: string): string {
    const { clientId, callbackUrl } = config().github.oauth
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'read:user',
      state,
    })

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  async exchangeCodeForUser(code: string): Promise<User> {
    const { clientId, clientSecret } = config().github.oauth

    let tokenData
    let profile

    try {
      tokenData = await this.githubService.exchangeOAuthCode(code, { clientId, clientSecret })

      if (!tokenData.access_token) {
        throw new UnauthorizedException('No access token received from GitHub')
      }

      profile = await this.githubService.getAuthenticatedUser(tokenData.access_token)
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      throw new UnauthorizedException(err instanceof Error ? err.message : 'GitHub OAuth failed')
    }

    return this.usersService.findOrCreateFromGitHub(profile)
  }

  generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
    }
    return this.jwtService.sign(payload)
  }

  async validateToken(payload: JwtPayload): Promise<User | null> {
    return this.usersService.findById(payload.sub)
  }
}
