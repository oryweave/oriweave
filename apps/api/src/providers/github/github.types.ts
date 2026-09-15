interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

interface GitHubUserResponse {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

interface GitHubRepoResponse {
  stargazers_count: number
  forks_count: number
}

export type { GitHubTokenResponse, GitHubUserResponse, GitHubRepoResponse }
