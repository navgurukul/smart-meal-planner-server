import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { ScanQrDto } from "./dto/scan-qr.dto";
import { QrTokenService } from "./qr-token.service";

@ApiTags("QR Tokens")
@ApiBearerAuth("JWT-auth")
@Controller("qr-token")
export class QrTokenController {
  constructor(private readonly qrTokenService: QrTokenService) {}

  @UseGuards(JwtAuthGuard, requireRole("INCHARGE", "KITCHEN_STAFF", "ADMIN", "SUPER_ADMIN"))
  @ApiQuery({ name: "campus_id", type: Number, required: true })
  @Get("today")
  getToday(
    @Query("campus_id") campusId: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.qrTokenService.getToday(
      campusId ? Number(campusId) : 0,
      req.user!,
    );
  }

  @UseGuards(JwtAuthGuard, requireRole("STUDENT"))
  @Post("scan")
  scan(
    @Body() body: ScanQrDto,
    @Req() req: RequestWithUser,
  ) {
    return this.qrTokenService.scan(body.token, req.user!);
  }

  @UseGuards(JwtAuthGuard, requireRole("STUDENT"))
  @Post("receive")
  receive(
    @Body() body: ScanQrDto,
    @Req() req: RequestWithUser,
  ) {
    return this.qrTokenService.confirmReceipt(body.token, req.user!);
  }
}
