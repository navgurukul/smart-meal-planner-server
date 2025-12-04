import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/db/drizzle.module";
import { CampusChangeRequestsController } from "./campus-change-requests.controller";
import { CampusChangeRequestsService } from "./campus-change-requests.service";

@Module({
  imports: [DrizzleModule],
  controllers: [CampusChangeRequestsController],
  providers: [CampusChangeRequestsService],
})
export class CampusChangeRequestsModule {}
