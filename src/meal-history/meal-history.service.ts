import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { and, eq, gte, lte } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant";
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";

@Injectable()
export class MealHistoryService {
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

  private ensureAdminAccess(user: AuthenticatedUser) {
    if (!this.isSuperAdmin(user) && !this.isAdmin(user)) {
      throw new ForbiddenException("Only admin can access meal history");
    }
  }

  private async buildHistory(
    from: string,
    to: string,
    slotFilter?: string,
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
        userId: schema.userMealRecord.userId,
        date: schema.userMealRecord.mealDate,
        slot: schema.mealSlots.name,
        selected: schema.userMealRecord.ordered,
        campusId: schema.userMealRecord.campusId,
      })
      .from(schema.userMealRecord)
      .innerJoin(
        schema.mealSlots,
        eq(schema.userMealRecord.mealSlotId, schema.mealSlots.id),
      )
      .where(
        and(
          gte(schema.userMealRecord.mealDate, from),
          lte(schema.userMealRecord.mealDate, to),
          normalizedSlot
            ? eq(schema.mealSlots.name, normalizedSlot as any)
            : undefined,
        ),
      );

    const receipts = await this.db
      .select({
        userId: schema.mealReceipts.userId,
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
          gte(schema.mealReceipts.date, from),
          lte(schema.mealReceipts.date, to),
          normalizedSlot
            ? eq(schema.mealSlots.name, normalizedSlot as any)
            : undefined,
        ),
      );

    // Get user details for each record
    const userIds = new Set<number>();
    selections.forEach((s) => userIds.add(s.userId));
    receipts.forEach((r) => userIds.add(r.userId));

    const users = await this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
      })
      .from(schema.users)
      .where(
        userIds.size > 0
          ? require("drizzle-orm").inArray(
              schema.users.id,
              Array.from(userIds),
            )
          : undefined,
      );

    const userMap = new Map(users.map((u) => [u.id, u]));

    const result: Record<
      string,
      Array<{
        studentName: string;
        email: string;
        campusId?: number;
        meal: string;
        selected: boolean;
        received: boolean;
        date: string;
      }>
    > = {};

    // Add selections
    for (const sel of selections) {
      const dateKey = sel.date;
      if (!result[dateKey]) result[dateKey] = [];

      const user = userMap.get(sel.userId);
      result[dateKey].push({
        studentName: user?.name ?? "Unknown",
        email: user?.email ?? "Unknown",
        campusId: sel.campusId ?? undefined,
        meal: sel.slot,
        selected: !!sel.selected,
        received: false,
        date: sel.date,
      });
    }

    // Mark receipts
    for (const rec of receipts) {
      const dateKey = rec.date;
      const user = userMap.get(rec.userId);

      // Find and update the selection record if exists
      let found = false;
      if (result[dateKey]) {
        for (const record of result[dateKey]) {
          if (
            record.studentName === (user?.name ?? "Unknown") &&
            record.meal === rec.slot
          ) {
            record.received = true;
            found = true;
            break;
          }
        }
      }

      // If no selection found, add as received-only record
      if (!found) {
        if (!result[dateKey]) result[dateKey] = [];
        result[dateKey].push({
          studentName: user?.name ?? "Unknown",
          email: user?.email ?? "Unknown",
          meal: rec.slot,
          selected: false,
          received: true,
          date: rec.date,
        });
      }
    }

    return result;
  }

  async getAll(
    from: string,
    to: string,
    user: AuthenticatedUser,
    slotFilter?: string,
  ) {
    this.ensureAdminAccess(user);
    return this.buildHistory(from, to, slotFilter);
  }
}
