import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/meal-items/db/drizzle.module";
import { MealHistoryService } from "./meal-history.service";
import { MealHistoryController } from "./meal-history.controller";

@Module({
  imports: [DrizzleModule],
  controllers: [MealHistoryController],
  providers: [MealHistoryService],
})
export class MealHistoryModule {}
