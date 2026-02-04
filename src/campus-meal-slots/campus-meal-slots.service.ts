import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { eq, inArray } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant"
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";
import {
  UpsertCampusMealSlotsDto,
  type MealSlotName,
} from "./dto/upsert-campus-meal-slots.dto";
import { UpdateCampusMealSlotsDto } from "./dto/update-campus-meal-slots.dto";

@Injectable()
export class CampusMealSlotsService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private isSuperAdmin(user: AuthenticatedUser) {
    return user.roles?.includes("SUPER_ADMIN");
  }

  private isAdmin(user: AuthenticatedUser) {
    return user.roles?.includes("ADMIN");
  }

  private ensureAccess(campusId: number, user: AuthenticatedUser) {
    if (this.isSuperAdmin(user)) return;
    if (this.isAdmin(user) && user.campusIds?.includes(campusId)) return;
    throw new ForbiddenException("Not permitted for this campus");
  }

  private sortSlotsByOrder(slots: Array<{ meal_slot: string }>) {
    const slotOrder = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"];
    return [...slots].sort((a, b) => {
      return slotOrder.indexOf(a.meal_slot) - slotOrder.indexOf(b.meal_slot);
    });
  }

  async getByCampus(campusId: number) {
    if (!campusId) {
      throw new BadRequestException("campus_id is required");
    }

    const [campus] = await this.db
      .select({ id: schema.campuses.id, name: schema.campuses.name })
      .from(schema.campuses)
      .where(eq(schema.campuses.id, campusId));
    if (!campus) {
      throw new BadRequestException("Campus not found");
    }

    const rows = await this.db
      .select({
        meal_slot_id: schema.mealSlots.id,
        meal_slot: schema.mealSlots.name,
        start_time: schema.campusMealSlots.startTime,
        end_time: schema.campusMealSlots.endTime,
        selection_deadline_offset_hours:
          schema.campusMealSlots.selectionDeadlineOffsetHours,
      })
      .from(schema.campusMealSlots)
      .innerJoin(
        schema.mealSlots,
        eq(schema.campusMealSlots.mealSlotId, schema.mealSlots.id),
      )
      .where(eq(schema.campusMealSlots.campusId, campusId))
      .orderBy(schema.mealSlots.id);

    return {
      campus_id: campusId,
      campus_name: campus.name,
      slots: this.sortSlotsByOrder(rows),
    };
  }

  private async upsertForCampus(
    campusId: number,
    slots: {
      meal_slot: MealSlotName;
      start_time: string;
      end_time: string;
      selection_deadline_offset_hours: number;
    }[],
    user: AuthenticatedUser,
  ) {
    this.ensureAccess(campusId, user);

    const [campus] = await this.db
      .select({ id: schema.campuses.id })
      .from(schema.campuses)
      .where(eq(schema.campuses.id, campusId));
    if (!campus) {
      throw new BadRequestException("Campus not found");
    }

    const slotNames = slots.map((s) => s.meal_slot);
    const slotRows = await this.db
      .select({ id: schema.mealSlots.id, name: schema.mealSlots.name })
      .from(schema.mealSlots)
      .where(inArray(schema.mealSlots.name, slotNames));

    const slotMap = new Map(slotRows.map((s) => [s.name, s.id]));
    const missing = slotNames.filter((n) => !slotMap.has(n));
    if (missing.length) {
      throw new BadRequestException(`Meal slots not found: ${missing.join(", ")}`);
    }

    for (const slot of slots) {
      const slotId = slotMap.get(slot.meal_slot)!;
      await this.db
        .insert(schema.campusMealSlots)
        .values({
          campusId,
          mealSlotId: slotId,
          startTime: slot.start_time,
          endTime: slot.end_time,
          selectionDeadlineOffsetHours: slot.selection_deadline_offset_hours,
        })
        .onConflictDoUpdate({
          target: [
            schema.campusMealSlots.campusId,
            schema.campusMealSlots.mealSlotId,
          ],
          set: {
            startTime: slot.start_time,
            endTime: slot.end_time,
            selectionDeadlineOffsetHours: slot.selection_deadline_offset_hours,
          },
        });
    }

    return { campus_id: campusId, slots: slots.length };
  }

  async upsert(dto: UpsertCampusMealSlotsDto, user: AuthenticatedUser) {
    return this.upsertForCampus(dto.campus_id, dto.slots as any, user);
  }

  async updateByCampusId(
    campusId: number,
    dto: UpdateCampusMealSlotsDto,
    user: AuthenticatedUser,
  ) {
    return this.upsertForCampus(campusId, dto.slots as any, user);
  }
}
