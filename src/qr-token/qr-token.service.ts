import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant";
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";

@Injectable()
export class QrTokenService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private ensureKitchenRole(user: AuthenticatedUser) {
    const allowed = ["INCHARGE", "KITCHEN_STAFF", "ADMIN", "SUPER_ADMIN"];
    if (!user.roles?.some((r) => allowed.includes(r))) {
      throw new ForbiddenException("Insufficient role");
    }
  }

  private ensureStudent(user: AuthenticatedUser) {
    if (!user.roles?.includes("STUDENT")) {
      throw new ForbiddenException("Only students can scan QR");
    }
  }

  private resolveExpiry(dateStr: string) {
    const end = new Date(`${dateStr}T23:59:59.999Z`);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException("Invalid date");
    }
    return end;
  }

  private parseMinutes(t: string) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  private async resolveCurrentSlot(campusId: number) {
    const slots = await this.db
      .select({
        id: schema.mealSlots.id,
        name: schema.mealSlots.name,
        startTime: schema.campusMealSlots.startTime,
        endTime: schema.campusMealSlots.endTime,
        mealItemId: schema.dailyMenuItems.mealItemId,
        mealItemName: schema.mealItems.name,
        mealItemDescription: schema.mealItems.description,
      })
      .from(schema.campusMealSlots)
      .innerJoin(
        schema.mealSlots,
        eq(schema.campusMealSlots.mealSlotId, schema.mealSlots.id),
      )
      .leftJoin(
        schema.dailyMenus,
        and(
          eq(schema.dailyMenus.campusId, campusId),
          eq(
            schema.dailyMenus.date,
            new Date().toISOString().slice(0, 10) as any,
          ),
        ),
      )
      .leftJoin(
        schema.dailyMenuItems,
        and(
          eq(schema.dailyMenuItems.dailyMenuId, schema.dailyMenus.id),
          eq(schema.dailyMenuItems.mealSlotId, schema.campusMealSlots.mealSlotId),
        ),
      )
      .leftJoin(
        schema.mealItems,
        eq(schema.dailyMenuItems.mealItemId, schema.mealItems.id),
      )
      .where(eq(schema.campusMealSlots.campusId, campusId));

    const nowIst = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    const nowMinutes = nowIst.getHours() * 60 + nowIst.getMinutes();

    return slots.find((slot) => {
      const start = this.parseMinutes(String(slot.startTime));
      const end = this.parseMinutes(String(slot.endTime));
      if (nowMinutes >= start && nowMinutes < end) {
        return true;
      }
      return false;
    });
  }

  private async validateScan(token: string, user: AuthenticatedUser) {
    this.ensureStudent(user);
    const campusId = user.campusId ?? user.campusIds?.[0] ?? null;
    if (!campusId) {
      throw new BadRequestException("Campus not set for user");
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const [qr] = await this.db
      .select()
      .from(schema.qrTokens)
      .where(
        and(
          eq(schema.qrTokens.token, token),
          eq(schema.qrTokens.campusId, campusId),
          eq(schema.qrTokens.date, todayIso),
        ),
      );

    if (!qr) {
      throw new NotFoundException("QR token not found for today");
    }

    if (new Date(qr.expiresAt) <= new Date()) {
      throw new BadRequestException("QR token expired");
    }

    const currentSlot = await this.resolveCurrentSlot(campusId);
    if (!currentSlot) {
      throw new BadRequestException("No active meal slot right now");
    }

    const [existingReceipt] = await this.db
      .select()
      .from(schema.mealReceipts)
      .where(
        and(
          eq(schema.mealReceipts.userId, user.id),
          eq(schema.mealReceipts.date, todayIso),
          eq(schema.mealReceipts.mealSlotId, currentSlot.id),
        ),
      );

    const [selection] = await this.db
      .select({ ordered: schema.userMealRecord.ordered })
      .from(schema.userMealRecord)
      .where(
        and(
          eq(schema.userMealRecord.userId, user.id),
          eq(schema.userMealRecord.mealDate, todayIso),
          eq(schema.userMealRecord.mealSlotId, currentSlot.id),
        ),
      );

    return { qr, campusId, currentSlot, existingReceipt, selection };
  }

  async getToday(campusId: number, user: AuthenticatedUser) {
    this.ensureKitchenRole(user);
    const today = new Date();
    const dateIso = today.toISOString().slice(0, 10);

    if (!campusId) {
      throw new BadRequestException("campus_id is required");
    }

    const [existing] = await this.db
      .select()
      .from(schema.qrTokens)
      .where(
        and(
          eq(schema.qrTokens.campusId, campusId),
          eq(schema.qrTokens.date, dateIso),
        ),
      );

    if (existing && new Date(existing.expiresAt) > new Date()) {
      return existing;
    }

    const expiresAt = this.resolveExpiry(dateIso);
    const token = randomUUID();

    const [created] = await this.db
      .insert(schema.qrTokens)
      .values({
        campusId,
        date: dateIso,
        token,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [schema.qrTokens.campusId, schema.qrTokens.date],
        set: {
          token,
          expiresAt,
        },
      })
      .returning();

    return created;
  }

  async scan(token: string, user: AuthenticatedUser) {
    const { currentSlot, existingReceipt, selection } =
      await this.validateScan(token, user);
    return {
      current_slot: currentSlot.name,
      already_received: !!existingReceipt,
      has_selection: selection ? !!selection.ordered : false,
      menu_item: currentSlot.mealItemId
        ? {
            id: currentSlot.mealItemId,
            name: currentSlot.mealItemName,
            description: currentSlot.mealItemDescription,
          }
        : null,
    };
  }

  async confirmReceipt(token: string, user: AuthenticatedUser) {
    const { qr, campusId, currentSlot, existingReceipt } =
      await this.validateScan(token, user);
    const todayIso = new Date().toISOString().slice(0, 10);

    if (!existingReceipt) {
      await this.db.insert(schema.mealReceipts).values({
        userId: user.id,
        campusId,
        date: todayIso,
        mealSlotId: currentSlot.id,
        qrTokenId: qr.id,
        timestamp: new Date(),
      });
    }

    return {
      current_slot: currentSlot.name,
      already_received: !!existingReceipt,
    };
  }
}
