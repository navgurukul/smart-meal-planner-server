import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { CampusMealSlotsService } from "./campus-meal-slots.service";
import { UpsertCampusMealSlotsDto } from "./dto/upsert-campus-meal-slots.dto";

@ApiTags("Campus Meal Slots")
@ApiBearerAuth("JWT-auth")
@Controller("campus-meal-slots")
export class CampusMealSlotsController {
  constructor(
    private readonly campusMealSlotsService: CampusMealSlotsService,
  ) {}

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @Post()
  upsert(
    @Body() body: UpsertCampusMealSlotsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.campusMealSlotsService.upsert(body, req.user!);
  }
}
