import cookieParser from 'cookie-parser'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { config } from '@/common/config'

// TypeORM's synchronize() (local/dev only — see CLAUDE.md's Schema management note;
// it's off in staging/production) drops stale indices via Promise.all() over a single
// shared QueryRunner/pg Client (RdbmsSchemaBuilder.dropOldIndices). That triggers pg's
// same-client-concurrent-query deprecation warning on any restart with an index diff to
// apply — upstream TypeORM behavior, not a bug in this app (confirmed: no raw `.query()`
// calls or unawaited concurrent queries anywhere in apps/api/src). Filtered narrowly by
// message text so any other warning still surfaces normally.
const originalEmitWarning = process.emitWarning.bind(process)
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const message = typeof warning === 'string' ? warning : warning.message
  if (message.includes('client.query() when the client is already executing a query')) {
    return
  }
  return (originalEmitWarning as (...args: unknown[]) => void)(warning, ...rest)
}) as typeof process.emitWarning

const logger = new Logger('Server')

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: config().client.url,
    credentials: true,
  })

  app.use(cookieParser())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  logger.log(`Server running on http://localhost:${config().server.port}`)

  await app.listen(config().server.port)
}
bootstrap().catch(console.error)
