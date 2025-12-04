import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { and, eq, inArray } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/db/constant";
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";
import { UpsertCampusMealSlotsDto } from "./dto/upsert-campus-meal-slots.dto";

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

  async upsert(dto: UpsertCampusMealSlotsDto, user: AuthenticatedUser) {
    this.ensureAccess(dto.campus_id, user);

    const [campus] = await this.db
      .select({ id: schema.campuses.id })
      .from(schema.campuses)
      .where(eq(schema.campuses.id, dto.campus_id));
    if (!campus) {
      throw new BadRequestException("Campus not found");
    }

    const slotNames = dto.slots.map((s) => s.meal_slot);
    const slotRows = await this.db
      .select({ id: schema.mealSlots.id, name: schema.mealSlots.name })
      .from(schema.mealSlots)
      .where(inArray(schema.mealSlots.name, slotNames as any));

    const slotMap = new Map(slotRows.map((s) => [s.name, s.id]));
    const missing = slotNames.filter((n) => !slotMap.has(n));
    if (missing.length) {
      throw new BadRequestException(
        `Meal slots not found: ${missing.join(", ")}`,
      );
    }

    for (const slot of dto.slots) {
      const slotId = slotMap.get(slot.meal_slot)!;
      await this.db
        .insert(schema.campusMealSlots)
        .values({
          campusId: dto.campus_id,
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

    return { campus_id: dto.campus_id, slots: dto.slots.length };
  }
}
