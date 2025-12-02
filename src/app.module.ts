import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from './db/drizzle.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [DrizzleModule, UsersModule , AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  
}
