import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { and, eq, inArray, gte, lte, ne } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant"
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";
import { UpdateMenuDto, UpsertMenuDto } from "./dto/upsert-menu.dto";

@Injectable()
export class MenusService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) { }

  private getIstDateKey(date: Date | string = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(typeof date === "string" ? new Date(date) : date);
  }

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

  private sortSlotsByOrder(result: Record<string, any>) {
    const slotOrder = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"];
    const sortedResult: typeof result = {};

    for (const date of Object.keys(result).sort()) {
      sortedResult[date] = {};
      for (const slot of slotOrder) {
        if (result[date][slot]) {
          sortedResult[date][slot] = result[date][slot];
        }
      }
    }
    return sortedResult;
  }

  async upsert(dto: UpsertMenuDto, user: AuthenticatedUser) {
    this.ensureMenuWriteAccess(dto.campus_id, user);

    const validSlots = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"];
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
    const dateOnly = new Date(`${dateIso}T00:00:00+05:30`);
    if (Number.isNaN(dateOnly.getTime())) {
      throw new BadRequestException("Invalid date");
    }

    const todayIst = this.getIstDateKey();
    if (dateIso < todayIst) {
      throw new BadRequestException("Cannot create menu for a past date");
    }

    // Fetch slot ids first so we can validate deadline and campus slot setup.
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

    if (dateIso === todayIst) {
      const slotIds = Array.from(new Set(slotRows.map((s) => s.id)));
      const campusSlotRows = await this.db
        .select({
          mealSlotId: schema.campusMealSlots.mealSlotId,
          startTime: schema.campusMealSlots.startTime,
          deadlineOffset: schema.campusMealSlots.selectionDeadlineOffsetHours,
        })
        .from(schema.campusMealSlots)
        .where(
          and(
            eq(schema.campusMealSlots.campusId, dto.campus_id),
            inArray(schema.campusMealSlots.mealSlotId, slotIds),
          ),
        );

      const campusSlotMap = new Map(campusSlotRows.map((r) => [r.mealSlotId, r]));
      const now = new Date();

      for (const item of dto.items) {
        const slotId = slotMap.get(item.slot)!;
        const campusSlot = campusSlotMap.get(slotId);

        if (!campusSlot) {
          throw new BadRequestException(
            `Campus meal slot not configured for ${item.slot}`,
          );
        }

        const { deadlineDate } = this.computeDeadlineIst(
          dateIso,
          String(campusSlot.startTime),
          campusSlot.deadlineOffset,
        );

        if (now > deadlineDate) {
          throw new BadRequestException(
            `Cannot create menu for ${item.slot} after deadline`,
          );
        }
      }
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
  async updateById(
    menuId: number,
    dto: UpdateMenuDto,
    user: AuthenticatedUser,
  ) {
    const [menu] = await this.db
      .select({
        id: schema.dailyMenuItems.id,
        dailyMenuId: schema.dailyMenuItems.dailyMenuId,
        mealSlotId: schema.dailyMenuItems.mealSlotId,
        campusId: schema.dailyMenus.campusId,
        date: schema.dailyMenus.date,
      })
      .from(schema.dailyMenuItems)
      .innerJoin(
        schema.dailyMenus,
        eq(schema.dailyMenuItems.dailyMenuId, schema.dailyMenus.id),
      )
      .where(eq(schema.dailyMenuItems.id, menuId));

    if (!menu) {
      throw new NotFoundException("Menu item not found");
    }

    this.ensureMenuWriteAccess(menu.campusId, user);

    const menuDate = this.getIstDateKey(menu.date);
    const todayIst = this.getIstDateKey();
    if (menuDate < todayIst) {
      throw new BadRequestException("Cannot edit menu for a past date");
    }

    if (menuDate === todayIst) {
      const [campusSlot] = await this.db
        .select({
          startTime: schema.campusMealSlots.startTime,
          deadlineOffset: schema.campusMealSlots.selectionDeadlineOffsetHours,
        })
        .from(schema.campusMealSlots)
        .where(
          and(
            eq(schema.campusMealSlots.campusId, menu.campusId),
            eq(schema.campusMealSlots.mealSlotId, menu.mealSlotId),
          ),
        );

      if (!campusSlot) {
        throw new BadRequestException("Campus meal slot not configured");
      }

      const { deadlineDate } = this.computeDeadlineIst(
        menuDate,
        String(campusSlot.startTime),
        campusSlot.deadlineOffset,
      );

      if (new Date() > deadlineDate) {
        throw new BadRequestException("Cannot edit menu after deadline");
      }
    }

    if (dto.meal_item_id === undefined && dto.slot === undefined) {
      throw new BadRequestException("At least one field is required to update");
    }

    const updates: Partial<typeof schema.dailyMenuItems.$inferInsert> = {};

    if (dto.meal_item_id !== undefined) {
      const [mealItem] = await this.db
        .select({ id: schema.mealItems.id, isActive: schema.mealItems.isActive })
        .from(schema.mealItems)
        .where(eq(schema.mealItems.id, dto.meal_item_id));

      if (!mealItem) {
        throw new BadRequestException(`Meal items not found: ${dto.meal_item_id}`);
      }
      if (!mealItem.isActive) {
        throw new BadRequestException(`Meal items inactive: ${dto.meal_item_id}`);
      }

      updates.mealItemId = dto.meal_item_id;
    }

    if (dto.slot !== undefined) {
      const [slotRow] = await this.db
        .select({ id: schema.mealSlots.id, name: schema.mealSlots.name })
        .from(schema.mealSlots)
        .where(eq(schema.mealSlots.name, dto.slot));

      if (!slotRow) {
        throw new BadRequestException(`Meal slots not seeded: ${dto.slot}`);
      }

      const [duplicate] = await this.db
        .select({ id: schema.dailyMenuItems.id })
        .from(schema.dailyMenuItems)
        .where(
          and(
            eq(schema.dailyMenuItems.dailyMenuId, menu.dailyMenuId),
            eq(schema.dailyMenuItems.mealSlotId, slotRow.id),
            ne(schema.dailyMenuItems.id, menu.id),
          ),
        );

      if (duplicate) {
        throw new BadRequestException(
          "A meal already exists for this date and meal type",
        );
      }

      updates.mealSlotId = slotRow.id;
    }

    const [updated] = await this.db
      .update(schema.dailyMenuItems)
      .set(updates)
      .where(eq(schema.dailyMenuItems.id, menu.id))
      .returning({
        id: schema.dailyMenuItems.id,
        dailyMenuId: schema.dailyMenuItems.dailyMenuId,
      });

    if (!updated) {
      throw new NotFoundException("Menu item not found");
    }

    return { menu_id: updated.id, daily_menu_id: updated.dailyMenuId };
  }

  async deleteById(dailyMenuItemId: number, user: AuthenticatedUser) {
    const [menuItem] = await this.db
      .select({
        id: schema.dailyMenuItems.id,
        dailyMenuId: schema.dailyMenuItems.dailyMenuId,
      })
      .from(schema.dailyMenuItems)
      .where(eq(schema.dailyMenuItems.id, dailyMenuItemId));

    if (!menuItem) {
      throw new NotFoundException("Menu item not found");
    }

    const [dailyMenu] = await this.db
      .select({ id: schema.dailyMenus.id, campusId: schema.dailyMenus.campusId })
      .from(schema.dailyMenus)
      .where(eq(schema.dailyMenus.id, menuItem.dailyMenuId));

    if (!dailyMenu) {
      throw new NotFoundException("Daily menu not found");
    }

    this.ensureMenuWriteAccess(dailyMenu.campusId, user);

    await this.db
      .delete(schema.dailyMenuItems)
      .where(eq(schema.dailyMenuItems.id, dailyMenuItemId));

    return { status: "success", message: "Menu item deleted successfully" };
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
        dailyMenuItemId: schema.dailyMenuItems.id,
        date: schema.dailyMenus.date,
        slotId: schema.mealSlots.id,
        slotName: schema.mealSlots.name,
        itemId: schema.mealItems.id,
        itemName: schema.mealItems.name,
        itemDescription: schema.mealItems.description,
        slotStart: schema.campusMealSlots.startTime,
        slotEnd: schema.campusMealSlots.endTime,
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
      .innerJoin(
        schema.campusMealSlots,
        and(
          eq(schema.campusMealSlots.mealSlotId, schema.dailyMenuItems.mealSlotId),
          eq(schema.campusMealSlots.campusId, campusId),
        ),
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
      Record<string, { menu_id: number; meal_item_id: number; name: string; description: string | null; start_time: string; end_time: string }>
    > = {};

    for (const row of menus) {
      const dateKey = row.date.toString().slice(0, 10);
      if (!result[dateKey]) {
        result[dateKey] = {} as any;
      }
      result[dateKey][row.slotName] = {
        menu_id: row.dailyMenuItemId,
        meal_item_id: row.itemId,
        name: row.itemName,
        description: row.itemDescription,
        start_time: String(row.slotStart),
        end_time: String(row.slotEnd),
      };
    }

    return this.sortSlotsByOrder(result);
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
        dailyMenuItemId: schema.dailyMenuItems.id,
        date: schema.dailyMenus.date,
        slotName: schema.mealSlots.name,
        slotStart: schema.campusMealSlots.startTime,
        slotEnd: schema.campusMealSlots.endTime,
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
          eq(schema.userMealRecord.campusId, campusId),
          gte(schema.userMealRecord.mealDate, from),
          lte(schema.userMealRecord.mealDate, to),
        ),
      );

    const receipts = await this.db
      .select({
        date: schema.mealReceipts.date,
        slotName: schema.mealSlots.name,
      })
      .from(schema.mealReceipts)
      .innerJoin(
        schema.mealSlots,
        eq(schema.mealReceipts.mealSlotId, schema.mealSlots.id),
      )
      .where(
        and(
          eq(schema.mealReceipts.userId, user.id),
          eq(schema.mealReceipts.campusId, campusId),
          gte(schema.mealReceipts.date, from),
          lte(schema.mealReceipts.date, to),
        ),
      );

    const selectionMap = new Map<string, { responded: boolean; ordered: boolean; received: boolean }>();

    selections.forEach((s) => {
      const dateKey = s.date.toString().slice(0, 10);
      selectionMap.set(`${dateKey}-${s.slotName}`, {
        responded: true,
        ordered: !!s.ordered,
        received: !!s.received,
      });
    });

    receipts.forEach((r) => {
      const dateKey = r.date.toString().slice(0, 10);
      const key = `${dateKey}-${r.slotName}`;
      const existing = selectionMap.get(key);
      if (existing) {
        existing.received = true;
      } else {
        selectionMap.set(key, {
          responded: false,
          ordered: false,
          received: true,
        });
      }
    });
    const now = new Date();
    const result: Record<
      string,
      Record<string, {
        menu_id: number;
        meal_item_id: number;
        name: string;
        description: string | null;
        start_time: string;
        end_time: string;
        selected: boolean;
        ordered: boolean;
        received: boolean;
        status: "SELECTED" | "NOT_INTERESTED" | "NOT_SELECTED" | "CLOSED";
        deadline: string;
      }>
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
      const received = selection?.received ?? false;

      const status = ordered
        ? "SELECTED"
        : responded
          ? "NOT_INTERESTED"
          : now > deadlineDate
            ? "CLOSED"
            : "NOT_SELECTED";

      if (!result[dateKey]) result[dateKey] = {} as any;
      result[dateKey][row.slotName] = {
        menu_id: row.dailyMenuItemId,
        meal_item_id: row.mealItemId,
        name: row.mealItemName,
        description: row.mealItemDescription,
        start_time: String(row.slotStart),
        end_time: String(row.slotEnd),
        selected: responded,
        ordered,
        received,
        status,
        deadline: deadlineIst,
      };
    }
    return this.sortSlotsByOrder(result);
  }
}
