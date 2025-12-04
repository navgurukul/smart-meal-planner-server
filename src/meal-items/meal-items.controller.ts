import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { CreateMealItemDto } from "./dto/create-meal-item.dto";
import { MealItemsService } from "./meal-items.service";

@ApiTags("Meal Items")
@ApiBearerAuth("JWT-auth")
@Controller("meal-items")
export class MealItemsController {
  constructor(private readonly mealItemsService: MealItemsService) {}

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @Post()
  create(@Body() body: CreateMealItemDto, @Req() req: RequestWithUser) {
    return this.mealItemsService.create(body, req.user!);
  }
}
