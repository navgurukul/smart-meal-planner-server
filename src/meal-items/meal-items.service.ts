import { BadRequestException, Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/db/constant";
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
