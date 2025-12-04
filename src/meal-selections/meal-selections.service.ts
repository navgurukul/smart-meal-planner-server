import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { and, eq, gte, lte, inArray, or } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/db/constant";
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";
import { CreateMealSelectionDto } from "./dto/create-meal-selection.dto";

@Injectable()
export class MealSelectionsService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private ensureStudent(user: AuthenticatedUser) {
    if (!user.roles?.includes("STUDENT")) {
      throw new ForbiddenException("Only students can select meals");
    }
  }

  private resolveCampusId(user: AuthenticatedUser) {
    return user.campusId ?? user.campusIds?.[0] ?? null;
  }

  private isSuperAdmin(user: AuthenticatedUser) {
    return user.roles?.includes("SUPER_ADMIN");
  }

  private isAdmin(user: AuthenticatedUser) {
    return user.roles?.includes("ADMIN");
  }

  private async resolveUserPrimaryCampus(userId: number) {
    const [primary] = await this.db
      .select({ campusId: schema.userCampuses.campusId })
      .from(schema.userCampuses)
      .where(
        and(
          eq(schema.userCampuses.userId, userId),
          eq(schema.userCampuses.isPrimary, true),
        ),
      );
    if (primary?.campusId) return primary.campusId;

    const [fallback] = await this.db
      .select({ campusId: schema.users.campusId })
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    return fallback?.campusId ?? null;
  }

  private computeDeadline(date: string, slotStart: string, offsetHours: number): Date {
    const start = new Date(`${date}T${slotStart}`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException("Invalid date or slot start time");
    }
    const msOffset = offsetHours * 60 * 60 * 1000;
    return new Date(start.getTime() + msOffset);
  }

  private expandDates(dto: CreateMealSelectionDto) {
    if (dto.date) return [dto.date];
    if (dto.from && dto.to) {
      const start = new Date(dto.from);
      const end = new Date(dto.to);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        throw new BadRequestException("Invalid date range");
      }
      const dates: string[] = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setDate(cursor.getDate() + 1);
      }
      return dates;
    }
    throw new BadRequestException("Provide either date or from/to range");
  }

  async create(dto: CreateMealSelectionDto, user: AuthenticatedUser) {
    this.ensureStudent(user);
    const campusId = this.resolveCampusId(user);
    if (!campusId) {
      throw new BadRequestException("Campus not set for user");
    }

    const dates = this.expandDates(dto);
    const results: any[] = [];

    // Pre-fetch slots for campus
    const slotRows = await this.db
      .select({
        id: schema.mealSlots.id,
        name: schema.mealSlots.name,
        startTime: schema.campusMealSlots.startTime,
        selectionDeadlineOffsetHours:
          schema.campusMealSlots.selectionDeadlineOffsetHours,
      })
      .from(schema.campusMealSlots)
      .innerJoin(
        schema.mealSlots,
        eq(schema.campusMealSlots.mealSlotId, schema.mealSlots.id),
      )
      .where(eq(schema.campusMealSlots.campusId, campusId));

    const slotMap = new Map(slotRows.map((s) => [s.name, s]));

    for (const item of dto.items) {
      const slot = slotMap.get(item.meal_slot);
      if (!slot) {
        throw new BadRequestException(`Meal slot not found for campus: ${item.meal_slot}`);
      }

      for (const date of dates) {
        const deadline = this.computeDeadline(
          date,
          slot.startTime,
          slot.selectionDeadlineOffsetHours,
        );

        if (new Date() > deadline) {
          throw new BadRequestException(
            `Selection window closed for ${date} ${item.meal_slot}`,
          );
        }

        await this.db
          .insert(schema.userMealRecord)
          .values({
            userId: user.id,
            campusId,
            mealDate: date,
            mealSlotId: slot.id,
            menuCampusJson: {}, // placeholder payload; can be expanded later
            ordered: item.selected,
            received: false,
          })
          .onConflictDoUpdate({
            target: [
              schema.userMealRecord.userId,
              schema.userMealRecord.mealDate,
              schema.userMealRecord.mealSlotId,
            ],
            set: {
              campusId,
              menuCampusJson: {},
              ordered: item.selected,
              received: false,
            },
          });

        results.push({
          date,
          meal_slot: item.meal_slot,
          selected: item.selected,
          deadline: deadline.toISOString(),
        });
      }
    }

    return { results };
  }

  async getMine(
    from: string,
    to: string,
    user: AuthenticatedUser,
  ): Promise<
    Record<
      string,
      {
        [slot: string]: {
          selected: boolean;
          received: boolean;
        };
      }
    >
  > {
    this.ensureStudent(user);
    if (!from || !to) {
      throw new BadRequestException("from and to are required");
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Invalid date range");
    }

    const rows = await this.db
      .select({
        date: schema.userMealRecord.mealDate,
        slot: schema.mealSlots.name,
        selected: schema.userMealRecord.ordered,
        received: schema.userMealRecord.received,
      })
      .from(schema.userMealRecord)
      .innerJoin(
        schema.mealSlots,
        eq(schema.userMealRecord.mealSlotId, schema.mealSlots.id),
      )
      .where(
        and(
          eq(schema.userMealRecord.userId, user.id),
          gte(schema.userMealRecord.mealDate, from),
          lte(schema.userMealRecord.mealDate, to),
        ),
      )
      .orderBy(schema.userMealRecord.mealDate);

    const result: Record<
      string,
      { [slot: string]: { selected: boolean; received: boolean } }
    > = {};

    for (const row of rows) {
      const dateKey = row.date;
      if (!result[dateKey]) {
        result[dateKey] = {};
      }
      result[dateKey][row.slot] = {
        selected: !!row.selected,
        received: !!row.received,
      };
    }

    return result;
  }

  private async buildHistory(
    targetUserId: number,
    from: string,
    to: string,
    slotFilter?: string,
    campusId?: number,
  ) {
    if (!from || !to) {
      throw new BadRequestException("from and to are required");
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Invalid date range");
    }

    const slotRows = await this.db
      .select({ id: schema.mealSlots.id, name: schema.mealSlots.name })
      .from(schema.mealSlots);
    const slotById = new Map<number, string>(
      slotRows.map((s) => [s.id, s.name]),
    );
    const slotNames = new Set<string>(slotRows.map((s) => s.name));

    let normalizedSlot: string | undefined;
    if (slotFilter) {
      const numeric = Number(slotFilter);
      if (!Number.isNaN(numeric)) {
        normalizedSlot = slotById.get(numeric);
      } else {
        normalizedSlot = slotFilter.toUpperCase();
      }

      if (!normalizedSlot || !slotNames.has(normalizedSlot)) {
        throw new BadRequestException(
          `Invalid slot filter. Allowed names: ${[...slotNames].join(
            ", ",
          )} or valid slot ids.`,
        );
      }
    }

    const selections = await this.db
      .select({
        date: schema.userMealRecord.mealDate,
        slot: schema.mealSlots.name,
        selected: schema.userMealRecord.ordered,
      })
      .from(schema.userMealRecord)
      .innerJoin(
        schema.mealSlots,
        eq(schema.userMealRecord.mealSlotId, schema.mealSlots.id),
      )
      .where(
        and(
          eq(schema.userMealRecord.userId, targetUserId),
          gte(schema.userMealRecord.mealDate, from),
          lte(schema.userMealRecord.mealDate, to),
          normalizedSlot
            ? eq(schema.mealSlots.name, normalizedSlot as any)
            : undefined,
          campusId ? eq(schema.userMealRecord.campusId, campusId) : undefined,
        ),
      );

    const receipts = await this.db
      .select({
        date: schema.mealReceipts.date,
        slot: schema.mealSlots.name,
      })
      .from(schema.mealReceipts)
      .innerJoin(
        schema.mealSlots,
        eq(schema.mealReceipts.mealSlotId, schema.mealSlots.id),
      )
      .where(
        and(
          eq(schema.mealReceipts.userId, targetUserId),
          gte(schema.mealReceipts.date, from),
          lte(schema.mealReceipts.date, to),
          normalizedSlot
            ? eq(schema.mealSlots.name, normalizedSlot as any)
            : undefined,
        ),
      );

    const result: Record<
      string,
      { [slot: string]: { selected: boolean; received: boolean } }
    > = {};

    for (const sel of selections) {
      const dateKey = sel.date;
      if (!result[dateKey]) result[dateKey] = {};
      result[dateKey][sel.slot] = {
        selected: !!sel.selected,
        received: result[dateKey][sel.slot]?.received ?? false,
      };
    }

    for (const rec of receipts) {
      const dateKey = rec.date;
      if (!result[dateKey]) result[dateKey] = {};
      const existing = result[dateKey][rec.slot];
      result[dateKey][rec.slot] = {
        selected: existing?.selected ?? false,
        received: true,
      };
    }

    return result;
  }

  async getHistoryForStudent(
    from: string,
    to: string,
    user: AuthenticatedUser,
    slotFilter?: string,
  ) {
    this.ensureStudent(user);
    const campusId = this.resolveCampusId(user);
    return this.buildHistory(user.id, from, to, slotFilter, campusId ?? undefined);
  }

  async getHistoryForAdmin(
    targetUserId: number,
    from: string,
    to: string,
    requester: AuthenticatedUser,
    slotFilter?: string,
  ) {
    if (!this.isSuperAdmin(requester) && !this.isAdmin(requester)) {
      throw new ForbiddenException("Not permitted");
    }

    const targetCampus = await this.resolveUserPrimaryCampus(targetUserId);
    if (!targetCampus) {
      throw new BadRequestException("Target user campus not set");
    }

    if (!this.isSuperAdmin(requester)) {
      if (!requester.campusIds?.includes(targetCampus)) {
        throw new ForbiddenException("Campus access denied");
      }
    }

    return this.buildHistory(targetUserId, from, to, slotFilter, targetCampus);
  }
}
