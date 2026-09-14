import 'dotenv/config'
import { cleanEnv, port, str } from 'envalid'
import { env } from 'node:process'
import { Environment } from './enums'

class EnvManager {
  private static instance: EnvManager | null = null
  private env: NodeJS.ProcessEnv

  private constructor() {
    this.env = env
  }

  static getInstance(): EnvManager {
    EnvManager.instance ??= new EnvManager()
    return EnvManager.instance
  }

  getValue(key: string, defaultValue?: string): string {
    const raw = this.env[key]
    const envVal = raw !== undefined && raw !== '' ? raw : defaultValue

    if (envVal === undefined) {
      throw new Error(`Env variable "${key}" should be defined`)
    }

    return envVal
  }

  checkEnv() {
    const rules = {
      NODE_ENV: str({
        choices: [Environment.LOCAL, Environment.DEVELOPMENT, Environment.PRODUCTION],
      }),
      PORT: port({ default: 8085 }),
    }

    cleanEnv(this.env, rules)
  }
}

const envManager = EnvManager.getInstance()
const getEnvironmentValue = envManager.getValue.bind(envManager)
const checkEnvironment = envManager.checkEnv.bind(envManager)

export { getEnvironmentValue, checkEnvironment }
