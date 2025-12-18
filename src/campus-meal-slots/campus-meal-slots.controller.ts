import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { CampusMealSlotsService } from "./campus-meal-slots.service";
import { UpdateCampusMealSlotsDto } from "./dto/update-campus-meal-slots.dto";
import { UpsertCampusMealSlotsDto } from "./dto/upsert-campus-meal-slots.dto";

@ApiTags("Campus Meal Slots")
@ApiBearerAuth("JWT-auth")
@Controller("campus-meal-slots")
export class CampusMealSlotsController {
  constructor(
    private readonly campusMealSlotsService: CampusMealSlotsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: "campusId", type: Number, example: 1 })
  @Get(":campusId")
  getByCampus(@Param("campusId", ParseIntPipe) campusId: number) {
    return this.campusMealSlotsService.getByCampus(campusId);
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @ApiBody({ type: UpsertCampusMealSlotsDto })
  @Post()
  upsert(
    @Body() body: UpsertCampusMealSlotsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.campusMealSlotsService.upsert(body, req.user!);
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @ApiParam({ name: "campusId", type: Number, example: 1 })
  @ApiBody({ type: UpdateCampusMealSlotsDto })
  @Put(":campusId")
  updateByCampusId(
    @Param("campusId", ParseIntPipe) campusId: number,
    @Body() body: UpdateCampusMealSlotsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.campusMealSlotsService.updateByCampusId(campusId, body, req.user!);
  }
}
