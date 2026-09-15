import { Injectable } from '@nestjs/common'
import {
  type GitHubRepoResponse,
  type GitHubTokenResponse,
  type GitHubUserResponse,
} from './github.types'

const API_BASE = 'https://api.github.com'

@Injectable()
class GitHubService {
  async exchangeOAuthCode(
    code: string,
    credentials: { clientId: string; clientSecret: string },
  ): Promise<GitHubTokenResponse> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code,
      }),
    })

    if (!response.ok) {
      throw new Error(`GitHub OAuth token exchange failed (${response.status})`)
    }

    return response.json()
  }

  async getAuthenticatedUser(accessToken: string): Promise<GitHubUserResponse> {
    const response = await fetch(`${API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub user profile (${response.status})`)
    }

    return response.json()
  }

  async getRepo(owner: string, repo: string, token?: string): Promise<GitHubRepoResponse> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE}/repos/${owner}/${repo}`, { headers })

    if (!response.ok) {
      throw new Error(`GitHub API responded ${response.status}`)
    }

    return response.json()
  }
}

export { GitHubService }
