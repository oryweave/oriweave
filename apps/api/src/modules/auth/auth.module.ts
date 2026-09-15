import { Module } from '@nestjs/common'
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'
import { OptionalAuthGuard } from './auth-optional.guard'
import { config } from '@/common/config'
import { GitHubModule } from '@/providers/github/github.module'
import { UsersModule } from '@/modules/users/user.module'

@Module({
  imports: [
    UsersModule,
    GitHubModule,
    JwtModule.register({
      secret: config().auth.jwt.secret,
      signOptions: { expiresIn: config().auth.jwt.expiresIn as JwtSignOptions['expiresIn'] },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OptionalAuthGuard],
  exports: [AuthService, AuthGuard, OptionalAuthGuard, JwtModule, UsersModule],
})
export class AuthModule {}
