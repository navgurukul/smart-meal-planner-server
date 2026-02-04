import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { CampusChangeRequestsModule } from "./campus-change-requests/campus-change-requests.module";
import { DrizzleModule } from "src/meal-items/db/drizzle.module";
import { AuthMiddleware } from "./middleware/auth.middleware";
import { MealItemsModule } from "./meal-items/meal-items.module";
import { MealSelectionsModule } from "./meal-selections/meal-selections.module";
import { MenusModule } from "./menus/menus.module";
import { KitchenModule } from "./kitchen/kitchen.module";
import { QrTokenModule } from "./qr-token/qr-token.module";
import { UsersModule } from "./users/users.module";
import { CampusMealSlotsModule } from "./campus-meal-slots/campus-meal-slots.module";
import { CampusesModule } from "./campuses/campuses.module";
import { BulkUploadModule } from "./bulk-upload/bulk-upload.mudule";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DrizzleModule,
    UsersModule,
    CampusChangeRequestsModule,
    MenusModule,
    MealSelectionsModule,
    MealItemsModule,
    KitchenModule,
    QrTokenModule,
    CampusMealSlotsModule,
    CampusesModule,
    AuthModule,
    BulkUploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("*");
  }
}
