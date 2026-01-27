import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { and, eq, inArray, gte, lte } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant"
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";
import { UpsertMenuDto } from "./dto/upsert-menu.dto";

@Injectable()
export class MenusService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private isSuperAdmin(user: AuthenticatedUser) {
    return user.roles?.includes("SUPER_ADMIN");
  }

  private computeDeadlineIst(
    date: string,
    slotStart: string,
    offsetHours: number,
  ) {
    // Parse slot time as IST and apply offset in hours.
    const start = new Date(`${date}T${slotStart}+05:30`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException("Invalid date or slot start time");
    }
    const deadlineDate = new Date(start.getTime() + offsetHours * 60 * 60 * 1000);

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(deadlineDate)
      .reduce<Record<string, string>>((acc, p) => {
        if (p.type !== "literal") acc[p.type] = p.value;
        return acc;
      }, {});

    const deadlineIst =
      `${parts.year}-${parts.month}-${parts.day}` +
      `T${parts.hour}:${parts.minute}:${parts.second}+05:30`;

    return { deadlineDate, deadlineIst };
  }

  private isAdmin(user: AuthenticatedUser) {
    return user.roles?.includes("ADMIN");
  }

  private ensureMenuWriteAccess(campusId: number, user: AuthenticatedUser) {
    if (this.isSuperAdmin(user)) return;
    if (this.isAdmin(user) && user.campusIds?.includes(campusId)) return;
    throw new ForbiddenException("Not permitted for this campus");
  }

  async upsert(dto: UpsertMenuDto, user: AuthenticatedUser) {
    this.ensureMenuWriteAccess(dto.campus_id, user);

    const validSlots = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"];
    const slotsProvided = dto.items.map((i) => i.slot);
    const invalid = slotsProvided.filter((s) => !validSlots.includes(s));
    if (invalid.length) {
      throw new BadRequestException(`Invalid slots: ${invalid.join(", ")}`);
    }

    const mealItemIds = dto.items.map((i) => i.meal_item_id);
    const mealItems = await this.db
      .select({ id: schema.mealItems.id, isActive: schema.mealItems.isActive })
      .from(schema.mealItems)
      .where(inArray(schema.mealItems.id, mealItemIds));

    const missingIds = mealItemIds.filter(
      (id) => !mealItems.find((mi) => mi.id === id),
    );
    if (missingIds.length) {
      throw new BadRequestException(`Meal items not found: ${missingIds.join(", ")}`);
    }
    const inactive = mealItems.filter((mi) => !mi.isActive).map((mi) => mi.id);
    if (inactive.length) {
      throw new BadRequestException(`Meal items inactive: ${inactive.join(", ")}`);
    }

    const dateIso = dto.date;
    const dateOnly = new Date(dateIso);
    if (Number.isNaN(dateOnly.getTime())) {
      throw new BadRequestException("Invalid date");
    }

    const [dailyMenu] = await this.db
      .insert(schema.dailyMenus)
      .values({
        campusId: dto.campus_id,
        date: dateIso,
      })
      .onConflictDoUpdate({
        target: [schema.dailyMenus.campusId, schema.dailyMenus.date],
        set: { campusId: dto.campus_id, date: dateIso },
      })
      .returning({ id: schema.dailyMenus.id });

    // Fetch slot ids
    const slotRows = await this.db
      .select({ id: schema.mealSlots.id, name: schema.mealSlots.name })
      .from(schema.mealSlots)
      .where(inArray(schema.mealSlots.name, slotsProvided as any));
    const slotMap = new Map(slotRows.map((s) => [s.name, s.id]));
    const missingSlots = slotsProvided.filter((s) => !slotMap.has(s));
    if (missingSlots.length) {
      throw new BadRequestException(
        `Meal slots not seeded: ${missingSlots.join(", ")}`,
      );
    }

    for (const item of dto.items) {
      const slotId = slotMap.get(item.slot)!;
      await this.db
        .insert(schema.dailyMenuItems)
        .values({
          dailyMenuId: dailyMenu.id,
          mealSlotId: slotId,
          mealItemId: item.meal_item_id,
        })
        .onConflictDoUpdate({
          target: [schema.dailyMenuItems.dailyMenuId, schema.dailyMenuItems.mealSlotId],
          set: { mealItemId: item.meal_item_id },
        });
    }

    return { daily_menu_id: dailyMenu.id };
  }

  async getMenus(
    campusId: number,
    from: string,
    to: string,
    _user: AuthenticatedUser,
  ) {
    if (!campusId) {
      throw new BadRequestException("campus_id is required");
    }
    if (!from || !to) {
      throw new BadRequestException("from and to are required");
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Invalid date range");
    }

    const menus = await this.db
      .select({
        menuId: schema.dailyMenus.id,
        date: schema.dailyMenus.date,
        slotId: schema.mealSlots.id,
        slotName: schema.mealSlots.name,
        itemId: schema.mealItems.id,
        itemName: schema.mealItems.name,
        itemDescription: schema.mealItems.description,
      })
      .from(schema.dailyMenuItems)
      .innerJoin(
        schema.dailyMenus,
        eq(schema.dailyMenuItems.dailyMenuId, schema.dailyMenus.id),
      )
      .innerJoin(
        schema.mealSlots,
        eq(schema.dailyMenuItems.mealSlotId, schema.mealSlots.id),
      )
      .innerJoin(
        schema.mealItems,
        eq(schema.dailyMenuItems.mealItemId, schema.mealItems.id),
      )
      .where(
        and(
          eq(schema.dailyMenus.campusId, campusId),
          gte(schema.dailyMenus.date, from),
          lte(schema.dailyMenus.date, to),
        ),
      )
      .orderBy(schema.dailyMenus.date, schema.mealSlots.id);

    const result: Record<
      string,
      { [slot: string]: { meal_item_id: number; name: string; description: string | null } }
    > = {};

    for (const row of menus) {
      const dateKey = row.date.toString().slice(0, 10);
      if (!result[dateKey]) {
        result[dateKey] = {};
      }
      result[dateKey][row.slotName] = {
        meal_item_id: row.itemId,
        name: row.itemName,
        description: row.itemDescription,
      };
    }

    return result;
  }

  async getMenuWithSelections(
    campusId: number,
    from: string,
    to: string,
    user: AuthenticatedUser,
  ) {
    if (!campusId) {
      throw new BadRequestException("campus_id is required");
    }
    if (!from || !to) {
      throw new BadRequestException("from and to are required");
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException("Invalid date range");
    }

    const menuRows = await this.db
      .select({
        date: schema.dailyMenus.date,
        slotName: schema.mealSlots.name,
        slotStart: schema.campusMealSlots.startTime,
        deadlineOffset: schema.campusMealSlots.selectionDeadlineOffsetHours,
        mealItemId: schema.mealItems.id,
        mealItemName: schema.mealItems.name,
        mealItemDescription: schema.mealItems.description,
      })
      .from(schema.dailyMenuItems)
      .innerJoin(
        schema.dailyMenus,
        eq(schema.dailyMenuItems.dailyMenuId, schema.dailyMenus.id),
      )
      .innerJoin(
        schema.campusMealSlots,
        and(
          eq(schema.campusMealSlots.mealSlotId, schema.dailyMenuItems.mealSlotId),
          eq(schema.campusMealSlots.campusId, campusId),
        ),
      )
      .innerJoin(
        schema.mealSlots,
        eq(schema.campusMealSlots.mealSlotId, schema.mealSlots.id),
      )
      .innerJoin(
        schema.mealItems,
        eq(schema.dailyMenuItems.mealItemId, schema.mealItems.id),
      )
      .where(
        and(
          eq(schema.dailyMenus.campusId, campusId),
          gte(schema.dailyMenus.date, from),
          lte(schema.dailyMenus.date, to),
        ),
      );

    const selections = await this.db
      .select({
        id: schema.userMealRecord.id,
        date: schema.userMealRecord.mealDate,
        slotName: schema.mealSlots.name,
        ordered: schema.userMealRecord.ordered,
      })
      .from(schema.userMealRecord)
      .innerJoin(
        schema.mealSlots,
        eq(schema.userMealRecord.mealSlotId, schema.mealSlots.id),
      )
      .where(
        and(
          eq(schema.userMealRecord.userId, user.id),
          eq(schema.userMealRecord.campusId, campusId),
          gte(schema.userMealRecord.mealDate, from),
          lte(schema.userMealRecord.mealDate, to),
        ),
      );

    const selectionMap = new Map<string, { responded: boolean; ordered: boolean }>();
    selections.forEach((s) => {
      const dateKey = s.date.toString().slice(0, 10);
      selectionMap.set(`${dateKey}-${s.slotName}`, {
        responded: true,
        ordered: !!s.ordered,
      });
    });

    const now = new Date();
    const result: Record<
      string,
      {
        [slot: string]: {
          meal_item_id: number;
          name: string;
          description: string | null;
          selected: boolean;
          ordered: boolean;
          status: "SELECTED" | "NOT_INTERESTED" | "NOT_SELECTED" | "CLOSED";
          deadline: string;
          servingTime: string;
        };
      }
    > = {};

    for (const row of menuRows) {
      const dateKey = row.date.toString().slice(0, 10);
      const { deadlineDate, deadlineIst } = this.computeDeadlineIst(
        dateKey,
        String(row.slotStart),
        row.deadlineOffset,
      );
      const selection = selectionMap.get(`${dateKey}-${row.slotName}`);
      const responded = selection?.responded ?? false;
      const ordered = selection?.ordered ?? false;

      const status = ordered
        ? "SELECTED"
        : responded
          ? "NOT_INTERESTED"
          : now > deadlineDate
            ? "CLOSED"
            : "NOT_SELECTED";

      if (!result[dateKey]) result[dateKey] = {};
      result[dateKey][row.slotName] = {
        meal_item_id: row.mealItemId,
        name: row.mealItemName,
        description: row.mealItemDescription,
        selected: responded,
        ordered,
        status,
        deadline: deadlineIst,
        servingTime: String(row.slotStart),
      };
    }

    return result;
  }
}
