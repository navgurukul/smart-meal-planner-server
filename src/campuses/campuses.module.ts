import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/meal-items/db/drizzle.module";
import { CampusesController } from "./campuses.controller";
import { CampusesService } from "./campuses.service";

@Module({
  imports: [DrizzleModule],
  controllers: [CampusesController],
  providers: [CampusesService],
})
export class CampusesModule {}
