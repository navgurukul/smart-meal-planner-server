import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/meal-items/db/drizzle.module";
import { MenusController } from "./menus.controller";
import { MenusService } from "./menus.service";

@Module({
  imports: [DrizzleModule],
  controllers: [MenusController],
  providers: [MenusService],
})
export class MenusModule {}
export { DrizzleModule };

