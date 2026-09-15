import { Environment } from '@/common/utils/enums'
import { getEnvironmentValue, getSecretValue } from '@/common/utils/env'
import { type Config } from '.'

const config = (): Config => ({
  environment: getEnvironmentValue('NODE_ENV', Environment.LOCAL) as Environment,

  server: {
    port: Number(getEnvironmentValue('PORT', '8085')),
  },

  auth: {
    jwt: {
      secret: getSecretValue('JWT_SECRET', 'oriweave-dev-secret-change-in-production'),
      expiresIn: getEnvironmentValue('JWT_EXPIRES_IN', '7d'),
    },
  },

  database: {
    url: getSecretValue(
      'DATABASE_URL',
      'postgresql://postgres:postgres@localhost:5432/oriweave-db',
    ),
  },

  client: {
    url: getEnvironmentValue('CLIENT_URL', 'http://oriweave.localhost:5173'),
  },

  github: {
    oauth: {
      clientId: getEnvironmentValue('GITHUB_CLIENT_ID', ''),
      clientSecret: getSecretValue('GITHUB_CLIENT_SECRET', ''),
      callbackUrl: getEnvironmentValue(
        'GITHUB_CALLBACK_URL',
        'http://oriweave.localhost:8087/auth/github/callback',
      ),
    },
    statsToken: getEnvironmentValue('GITHUB_STATS_TOKEN', ''),
  },
})

export default config
