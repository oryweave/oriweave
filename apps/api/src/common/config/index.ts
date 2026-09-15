import { mergeDeepRight } from 'ramda'
import { type DeepPartial } from 'ts-essentials'
import defaultConfig from './default'
import devConfig from './development'
import localConfig from './local'
import prodConfig from './production'
import { Environment } from '@/common/utils/enums'
import { getEnvironmentValue } from '@/common/utils/env'

interface Config {
  environment: Environment

  server: {
    port: number
  }

  auth: {
    jwt: {
      secret: string
      expiresIn: string
    }
  }

  database: {
    url: string
  }

  client: {
    url: string
  }

  github: {
    oauth: {
      clientId: string
      clientSecret: string
      callbackUrl: string
    }
    statsToken: string
  }
}

const environment = getEnvironmentValue('NODE_ENV', Environment.LOCAL) as Environment
const getEnvironmentConfig = (): DeepPartial<Config> => {
  switch (environment) {
    case Environment.DEVELOPMENT:
      return devConfig()
    case Environment.PRODUCTION:
      return prodConfig()
    case Environment.LOCAL:
    default:
      return localConfig()
  }
}
const config = (): Config => {
  const environmentConfig = getEnvironmentConfig()
  return mergeDeepRight(defaultConfig(), environmentConfig) as Config
}

export { config, type Config }
