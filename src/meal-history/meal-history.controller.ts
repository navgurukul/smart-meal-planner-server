import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { MealHistoryService } from "./meal-history.service";

@ApiTags("Meal History")
@ApiBearerAuth("JWT-auth")
@Controller("meal-history")
export class MealHistoryController {
  constructor(
    private readonly mealHistoryService: MealHistoryService,
  ) {}

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @ApiQuery({ name: "from", type: String, required: true })
  @ApiQuery({ name: "to", type: String, required: true })
  @ApiQuery({ name: "slot", type: String, required: false })
  @Get()
  getAll(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("slot") slot: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.mealHistoryService.getAll(
      from ?? "",
      to ?? "",
      req.user!,
      slot,
    );
  }
}
