import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DrizzleModule } from './db/drizzle.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [DrizzleModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
