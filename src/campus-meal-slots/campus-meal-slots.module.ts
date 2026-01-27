import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/menus/menus.module"
import { CampusMealSlotsController } from "./campus-meal-slots.controller";
import { CampusMealSlotsService } from "./campus-meal-slots.service";

@Module({
  imports: [DrizzleModule],
  controllers: [CampusMealSlotsController],
  providers: [CampusMealSlotsService],
})
export class CampusMealSlotsModule {}
