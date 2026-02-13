import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/meal-items/db/drizzle.module";
import { BulkUploadService } from './bulk-upload.service';
import { BulkUploadController } from './bulk-upload.controller';
import { UsersModule } from "src/users/users.module";

@Module({
  imports: [DrizzleModule, UsersModule],
  controllers: [BulkUploadController],
  providers: [BulkUploadService],
})
export class BulkUploadModule {}
