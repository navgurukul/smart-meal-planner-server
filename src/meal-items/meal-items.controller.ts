import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from "@nestjs/swagger";
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
  @ApiBody({ type: CreateMealItemDto })
  @Post()
  create(@Body() body: CreateMealItemDto, @Req() req: RequestWithUser) {
    return this.mealItemsService.create(body, req.user!);
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @ApiParam({ name: "mealItemId", type: Number, example: 1 })
  @ApiBody({ type: CreateMealItemDto })
  @Put(":mealItemId")
  updateById(
    @Param("mealItemId", ParseIntPipe) mealItemId: number,
    @Body() body: CreateMealItemDto,
    @Req() req: RequestWithUser,
  ) {
    return this.mealItemsService.updateById(mealItemId, body, req.user!);
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @ApiParam({ name: "mealItemId", type: Number, example: 1 })
  @Delete(":mealItemId")
  deleteById(
    @Param("mealItemId", ParseIntPipe) mealItemId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.mealItemsService.deleteById(mealItemId, req.user!);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list() {
    return this.mealItemsService.list();
  }
}
