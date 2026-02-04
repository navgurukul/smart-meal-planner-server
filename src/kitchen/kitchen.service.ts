import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { and, eq, sql, gte, lte } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant"
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";

@Injectable()
export class KitchenService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private isSuperAdmin(user: AuthenticatedUser) {
    return user.roles?.includes("SUPER_ADMIN");
  }

  private ensureKitchenRole(user: AuthenticatedUser) {
    const allowed = ["KITCHEN_STAFF", "INCHARGE", "ADMIN", "SUPER_ADMIN"];
    if (!user.roles?.some((r) => allowed.includes(r))) {
      throw new ForbiddenException("Not permitted");
    }
  }

  private ensureSuper(user: AuthenticatedUser) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException("Super admin only");
    }
  }

  async getSummary(campusId: number, date: string, user: AuthenticatedUser) {
    this.ensureKitchenRole(user);
    if (!campusId || !date) {
      throw new BadRequestException("campus_id and date are required");
    }
    if (!this.isSuperAdmin(user) && !user.campusIds?.includes(campusId)) {
      throw new ForbiddenException("Campus access denied");
    }

    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
      throw new BadRequestException("Invalid date");
    }

    const slots = await this.db
      .select({
        id: schema.mealSlots.id,
        name: schema.mealSlots.name,
      })
      .from(schema.mealSlots);

    const selectionCounts = await this.db
      .select({
        mealSlotId: schema.userMealRecord.mealSlotId,
        count: sql<number>`count(*)`,
      })
      .from(schema.userMealRecord)
      .where(
        and(
          eq(schema.userMealRecord.campusId, campusId),
          eq(schema.userMealRecord.mealDate, date),
          eq(schema.userMealRecord.ordered, true),
        ),
      )
      .groupBy(schema.userMealRecord.mealSlotId);

    const receiptCounts = await this.db
      .select({
        mealSlotId: schema.mealReceipts.mealSlotId,
        count: sql<number>`count(*)`,
      })
      .from(schema.mealReceipts)
      .where(
        and(
          eq(schema.mealReceipts.campusId, campusId),
          eq(schema.mealReceipts.date, date),
        ),
      )
      .groupBy(schema.mealReceipts.mealSlotId);

    const selectionMap = new Map<number, number>(
      selectionCounts.map((r) => [r.mealSlotId, Number(r.count)]),
    );
    const receiptMap = new Map<number, number>(
      receiptCounts.map((r) => [r.mealSlotId, Number(r.count)]),
    );

    return slots.map((slot) => {
      const selected = selectionMap.get(slot.id) ?? 0;
      const received = receiptMap.get(slot.id) ?? 0;
      return {
        meal_slot: slot.name,
        selected_count: selected,
        received_count: received,
        missed: selected > received ? selected - received : 0,
      };
    });
  }

  async getSuperSummary(from: string, to: string, user: AuthenticatedUser) {
    this.ensureSuper(user);
    if (!from || !to) {
      throw new BadRequestException("from and to are required");
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Invalid date range");
    }
    const dayCount =
      Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const campuses = await this.db
      .select({
        id: schema.campuses.id,
        name: schema.campuses.name,
      })
      .from(schema.campuses);

    const slots = await this.db
      .select({
        id: schema.mealSlots.id,
        name: schema.mealSlots.name,
      })
      .from(schema.mealSlots);

    const selCounts = await this.db
      .select({
        campusId: schema.userMealRecord.campusId,
        slotId: schema.userMealRecord.mealSlotId,
        total: sql<number>`count(*)`,
      })
      .from(schema.userMealRecord)
      .where(
        and(
          gte(schema.userMealRecord.mealDate, from),
          lte(schema.userMealRecord.mealDate, to),
          eq(schema.userMealRecord.ordered, true),
        ),
      )
      .groupBy(schema.userMealRecord.campusId, schema.userMealRecord.mealSlotId);

    const recCounts = await this.db
      .select({
        campusId: schema.mealReceipts.campusId,
        slotId: schema.mealReceipts.mealSlotId,
        total: sql<number>`count(*)`,
      })
      .from(schema.mealReceipts)
      .where(
        and(
          gte(schema.mealReceipts.date, from),
          lte(schema.mealReceipts.date, to),
        ),
      )
      .groupBy(schema.mealReceipts.campusId, schema.mealReceipts.mealSlotId);

    const selMap = new Map<string, number>();
    selCounts.forEach((r) => selMap.set(`${r.campusId}-${r.slotId}`, Number(r.total)));
    const recMap = new Map<string, number>();
    recCounts.forEach((r) => recMap.set(`${r.campusId}-${r.slotId}`, Number(r.total)));

    return campuses.map((campus) => {
      const slotSummaries = slots.map((slot) => {
        const key = `${campus.id}-${slot.id}`;
        const selectedTotal = selMap.get(key) ?? 0;
        const receivedTotal = recMap.get(key) ?? 0;
        const avgSelected = dayCount > 0 ? selectedTotal / dayCount : 0;
        const avgReceived = dayCount > 0 ? receivedTotal / dayCount : 0;
        const missedPct =
          selectedTotal > 0
            ? Math.max(selectedTotal - receivedTotal, 0) / selectedTotal
            : 0;
        return {
          meal_slot: slot.name,
          avg_selected: avgSelected,
          avg_received: avgReceived,
          missed_percentage: missedPct,
        };
      });

      return {
        campus_id: campus.id,
        campus_name: campus.name,
        slots: slotSummaries,
      };
    });
  }
}
