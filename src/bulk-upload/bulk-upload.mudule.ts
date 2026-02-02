import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/db/drizzle.module";
import { BulkUploadService } from './bulk-upload.service';
import { BulkUploadController } from './bulk-upload.controller';

@Module({
  imports: [DrizzleModule],
  controllers: [BulkUploadController],
  providers: [BulkUploadService],
})
export class BulkUploadModule {}