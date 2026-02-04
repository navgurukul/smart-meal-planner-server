import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/meal-items/db/drizzle.module";
import { MealItemsController } from "./meal-items.controller";
import { MealItemsService } from "./meal-items.service";

@Module({
  imports: [DrizzleModule],
  controllers: [MealItemsController],
  providers: [MealItemsService],
})
export class MealItemsModule {}
