import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { KitchenService } from "./kitchen.service";

@ApiTags("Kitchen")
@ApiBearerAuth("JWT-auth")
@Controller("kitchen")
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @UseGuards(
    JwtAuthGuard,
    requireRole("KITCHEN_STAFF", "INCHARGE", "ADMIN", "SUPER_ADMIN"),
  )
  @ApiQuery({ name: "campus_id", type: Number, required: true })
  @ApiQuery({ name: "date", type: String, required: true })
  @Get("summary")
  summary(
    @Query("campus_id") campusId: string | undefined,
    @Query("date") date: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.kitchenService.getSummary(
      campusId ? Number(campusId) : 0,
      date ?? "",
      req.user!,
    );
  }

  @UseGuards(JwtAuthGuard, requireRole("SUPER_ADMIN"))
  @Get("super/summary")
  superSummary(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.kitchenService.getSuperSummary(from ?? "", to ?? "", req.user!);
  }
}
