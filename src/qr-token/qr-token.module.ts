import { Module } from "@nestjs/common";
import { DrizzleModule } from "src/db/drizzle.module";
import { QrTokenController } from "./qr-token.controller";
import { QrTokenService } from "./qr-token.service";

@Module({
  imports: [DrizzleModule],
  controllers: [QrTokenController],
  providers: [QrTokenService],
})
export class QrTokenModule {}
