import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/db/drizzle.module";
import { MenusController } from "./menus.controller";
import { MenusService } from "./menus.service";

@Module({
  imports: [DrizzleModule],
  controllers: [MenusController],
  providers: [MenusService],
})
export class MenusModule {}
