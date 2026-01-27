import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/meal-items/db/drizzle.module"
import { KitchenController } from "./kitchen.controller";
import { KitchenService } from "./kitchen.service";

@Module({
  imports: [DrizzleModule],
  controllers: [KitchenController],
  providers: [KitchenService],
})
export class KitchenModule {}
