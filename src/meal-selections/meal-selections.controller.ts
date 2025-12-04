import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, ParseIntPipe } from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { CreateMealSelectionDto } from "./dto/create-meal-selection.dto";
import { MealSelectionsService } from "./meal-selections.service";

@ApiTags("Meal Selections")
@ApiBearerAuth("JWT-auth")
@Controller("meal-selections")
export class MealSelectionsController {
  constructor(
    private readonly mealSelectionsService: MealSelectionsService,
  ) {}

  @UseGuards(JwtAuthGuard, requireRole("STUDENT"))
  @Post()
  create(
    @Body() body: CreateMealSelectionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.mealSelectionsService.create(body, req.user!);
  }

  @UseGuards(JwtAuthGuard, requireRole("STUDENT"))
  @ApiQuery({ name: "from", type: String, required: true })
  @ApiQuery({ name: "to", type: String, required: true })
  @ApiQuery({ name: "slot", type: String, required: false })
  @Get("me")
  getMine(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("slot") slot: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.mealSelectionsService.getHistoryForStudent(
      from ?? "",
      to ?? "",
      req.user!,
      slot,
    );
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @ApiQuery({ name: "from", type: String, required: true })
  @ApiQuery({ name: "to", type: String, required: true })
  @ApiQuery({ name: "slot", type: String, required: false })
  @Get("/admin/students/:id/history")
  getStudentHistory(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("slot") slot: string | undefined,
    @Req() req: RequestWithUser,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.mealSelectionsService.getHistoryForAdmin(
      id,
      from ?? "",
      to ?? "",
      req.user!,
      slot,
    );
  }
}
