import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { and, eq, ne } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant";
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";
import { CreateMealItemDto } from "./dto/create-meal-item.dto";

@Injectable()
export class MealItemsService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreateMealItemDto, _user: AuthenticatedUser) {
    const name = dto.name.trim();
    const [existing] = await this.db
      .select({ id: schema.mealItems.id })
      .from(schema.mealItems)
      .where(eq(schema.mealItems.name, name));

    if (existing) {
      throw new BadRequestException("Meal item with this name already exists");
    }

    const [created] = await this.db
      .insert(schema.mealItems)
      .values({
        name,
        description: dto.description,
        isActive: dto.is_active ?? true,
      })
      .returning();

    return created;
  }

  async updateById(
    mealItemId: number,
    dto: CreateMealItemDto,
    _user: AuthenticatedUser,
  ) {
    const name = dto.name.trim();

    const [existing] = await this.db
      .select({ id: schema.mealItems.id })
      .from(schema.mealItems)
      .where(eq(schema.mealItems.id, mealItemId));

    if (!existing) {
      throw new NotFoundException("Meal item not found");
    }

    const [duplicate] = await this.db
      .select({ id: schema.mealItems.id })
      .from(schema.mealItems)
      .where(and(eq(schema.mealItems.name, name), ne(schema.mealItems.id, mealItemId)));

    if (duplicate) {
      throw new BadRequestException("Meal item with this name already exists");
    }

    const [updated] = await this.db
      .update(schema.mealItems)
      .set({
        name,
        description: dto.description,
        isActive: dto.is_active ?? true,
      })
      .where(eq(schema.mealItems.id, mealItemId))
      .returning();

    return updated;
  }

  async deleteById(mealItemId: number, _user: AuthenticatedUser) {
    const [existing] = await this.db
      .select({ id: schema.mealItems.id })
      .from(schema.mealItems)
      .where(eq(schema.mealItems.id, mealItemId));

    if (!existing) {
      throw new NotFoundException("Meal item not found");
    }

    const [usedInMenus] = await this.db
      .select({ id: schema.dailyMenuItems.id })
      .from(schema.dailyMenuItems)
      .where(eq(schema.dailyMenuItems.mealItemId, mealItemId))
      .limit(1);

    if (usedInMenus) {
      throw new BadRequestException(
        "Meal item is used in menus and cannot be deleted",
      );
    }

    await this.db
      .delete(schema.mealItems)
      .where(eq(schema.mealItems.id, mealItemId));

    return { status: "success", message: "Meal item deleted successfully" };
  }

  async list() {
    return this.db
      .select({
        id: schema.mealItems.id,
        name: schema.mealItems.name,
        description: schema.mealItems.description,
        is_active: schema.mealItems.isActive,
      })
      .from(schema.mealItems);
  }
}
