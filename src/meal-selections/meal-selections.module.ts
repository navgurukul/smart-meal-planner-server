import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/meal-items/db/drizzle.module";
import { MealSelectionsController } from "./meal-selections.controller";
import { MealSelectionsService } from "./meal-selections.service";

@Module({
  imports: [DrizzleModule],
  controllers: [MealSelectionsController],
  providers: [MealSelectionsService],
})
export class MealSelectionsModule {}
