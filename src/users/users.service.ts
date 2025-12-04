import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { and, eq, inArray, or } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/db/constant";
import * as schema from "src/schema/schema";
import { AuthenticatedUser } from "src/middleware/auth.middleware";
import { AssignRolesDto } from "./dto/assign-roles.dto";
import { SetUserCampusDto } from "./dto/set-user-campus.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
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

  async listUsers(
    campusId: number | null,
    requester: AuthenticatedUser,
  ): Promise<
    Array<{
      id: number;
      name: string | null;
      email: string;
      status: string | null;
      primaryCampusId: number | null;
      roles: string[];
    }>
  > {
    const superAdmin = this.isSuperAdmin(requester);
    const admin = this.isAdmin(requester);
    if (!superAdmin && !admin) {
      throw new ForbiddenException("Not permitted");
    }

    let resolvedCampusId = campusId;
    if (!superAdmin) {
      // Admin scope limited to their campuses
      if (
        resolvedCampusId &&
        !requester.campusIds?.includes(resolvedCampusId)
      ) {
        throw new ForbiddenException("Campus access denied");
      }
      resolvedCampusId =
        resolvedCampusId ??
        requester.campusId ??
        requester.campusIds?.[0] ??
        null;
    }

    const baseUsers = await this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        status: schema.users.status,
        primaryCampusId: schema.userCampuses.campusId,
        fallbackCampusId: schema.users.campusId,
      })
      .from(schema.users)
      .leftJoin(
        schema.userCampuses,
        and(
          eq(schema.userCampuses.userId, schema.users.id),
          eq(schema.userCampuses.isPrimary, true),
        ),
      )
      .where(
        resolvedCampusId
          ? or(
              eq(schema.users.campusId, resolvedCampusId),
              eq(schema.userCampuses.campusId, resolvedCampusId),
            )
          : undefined,
      );

    if (!baseUsers.length) {
      return [];
    }

    const userIds = baseUsers.map((u) => u.id);
    const roleRows = await this.db
      .select({
        userId: schema.userRole.userId,
        roleName: schema.roles.name,
      })
      .from(schema.userRole)
      .innerJoin(schema.roles, eq(schema.userRole.roleId, schema.roles.id))
      .where(inArray(schema.userRole.userId, userIds));

    const rolesByUser = roleRows.reduce<Record<number, string[]>>(
      (acc, row) => {
        acc[row.userId] = acc[row.userId] || [];
        acc[row.userId].push(row.roleName);
        return acc;
      },
      {},
    );

    return baseUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      status: u.status,
      primaryCampusId: u.primaryCampusId ?? u.fallbackCampusId ?? null,
      roles: rolesByUser[u.id] ?? [],
    }));
  }

  async createUser(dto: CreateUserDto, requester: AuthenticatedUser) {
    if (!this.isSuperAdmin(requester) && !this.isAdmin(requester)) {
      throw new ForbiddenException("Not permitted");
    }

    const [campus] = await this.db
      .select({ id: schema.campuses.id })
      .from(schema.campuses)
      .where(eq(schema.campuses.id, dto.campus_id));
    if (!campus) {
      throw new BadRequestException("Campus not found");
    }

    const [existing] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, dto.email));
    if (existing) {
      throw new BadRequestException("User with this email already exists");
    }

    const [user] = await this.db
      .insert(schema.users)
      .values({
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        campusId: dto.campus_id,
        address: dto.address,
        googleId: dto.google_id,
        status: dto.status ?? "active",
      })
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        campusId: schema.users.campusId,
        status: schema.users.status,
        address: schema.users.address,
      });

    // Ensure primary campus link
    await this.db.insert(schema.userCampuses).values({
      userId: user.id,
      campusId: dto.campus_id,
      isPrimary: true,
    }).onConflictDoUpdate({
      target: [schema.userCampuses.userId, schema.userCampuses.campusId],
      set: { isPrimary: true },
    });

    return user;
  }

  async updateUser(
    userId: number,
    dto: UpdateUserDto,
    requester: AuthenticatedUser,
  ) {
    if (!this.isSuperAdmin(requester) && !this.isAdmin(requester)) {
      throw new ForbiddenException("Not permitted");
    }

    const [existingUser] = await this.db
      .select({
        id: schema.users.id,
        campusId: schema.users.campusId,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!existingUser) {
      throw new NotFoundException("User not found");
    }

    let campusIdToSet = dto.campus_id ?? existingUser.campusId;

    if (dto.campus_id) {
      const [campus] = await this.db
        .select({ id: schema.campuses.id })
        .from(schema.campuses)
        .where(eq(schema.campuses.id, dto.campus_id));
      if (!campus) {
        throw new BadRequestException("Campus not found");
      }
    }

    if (
      !this.isSuperAdmin(requester) &&
      campusIdToSet &&
      !requester.campusIds?.includes(campusIdToSet)
    ) {
      throw new ForbiddenException("Campus access denied");
    }

    const [updated] = await this.db
      .update(schema.users)
      .set({
        name: dto.name ?? undefined,
        campusId: dto.campus_id ?? undefined,
        address: dto.address ?? undefined,
        googleId: dto.google_id ?? undefined,
        status: dto.status ?? undefined,
      })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        campusId: schema.users.campusId,
        status: schema.users.status,
        address: schema.users.address,
      });

    if (dto.campus_id) {
      // Update primary campus link
      await this.db
        .update(schema.userCampuses)
        .set({ isPrimary: false })
        .where(eq(schema.userCampuses.userId, userId));

      await this.db
        .insert(schema.userCampuses)
        .values({
          userId,
          campusId: dto.campus_id,
          isPrimary: true,
        })
        .onConflictDoUpdate({
          target: [schema.userCampuses.userId, schema.userCampuses.campusId],
          set: { isPrimary: true },
        });
    }

    return updated;
  }

  async assignRoles(
    userId: number,
    dto: AssignRolesDto,
    requester: AuthenticatedUser,
  ) {
    const superAdmin = this.isSuperAdmin(requester);
    const admin = this.isAdmin(requester);
    if (!superAdmin && !admin) {
      throw new ForbiddenException("Not permitted");
    }

    const roleNames = Array.from(new Set(dto.roles.map((r) => r.trim())));
    if (!roleNames.length) {
      return { roles: [] };
    }

    const allowedAdminRoles = new Set(["STUDENT", "KITCHEN_STAFF", "INCHARGE"]);
    if (!superAdmin) {
      const disallowed = roleNames.filter((r) => !allowedAdminRoles.has(r));
      if (disallowed.length) {
        throw new ForbiddenException(
          `Admins cannot assign roles: ${disallowed.join(", ")}`,
        );
      }
    }

    // Ensure target user exists and admin has campus scope
    const [targetUser] = await this.db
      .select({
        id: schema.users.id,
        campusId: schema.users.campusId,
        primaryCampusId: schema.userCampuses.campusId,
      })
      .from(schema.users)
      .leftJoin(
        schema.userCampuses,
        and(
          eq(schema.userCampuses.userId, schema.users.id),
          eq(schema.userCampuses.isPrimary, true),
        ),
      )
      .where(eq(schema.users.id, userId));

    if (!targetUser) {
      throw new NotFoundException("User not found");
    }

    const targetCampus =
      targetUser.primaryCampusId ?? targetUser.campusId ?? null;
    if (!superAdmin) {
      if (!targetCampus || !requester.campusIds?.includes(targetCampus)) {
        throw new ForbiddenException("Campus access denied");
      }
    }

    const roleRecords = await this.db
      .select({
        id: schema.roles.id,
        name: schema.roles.name,
      })
      .from(schema.roles)
      .where(inArray(schema.roles.name, roleNames));

    const missing = roleNames.filter(
      (name) => !roleRecords.find((r) => r.name === name),
    );
    if (missing.length) {
      throw new NotFoundException(`Roles not found: ${missing.join(", ")}`);
    }

    const existing = await this.db
      .select({
        roleId: schema.userRole.roleId,
      })
      .from(schema.userRole)
      .where(eq(schema.userRole.userId, userId));

    const existingRoleIds = new Set(existing.map((r) => r.roleId));
    const desiredRoleIds = new Set(roleRecords.map((r) => r.id));

    const toInsert = roleRecords
      .filter((r) => !existingRoleIds.has(r.id))
      .map((r) => ({
        userId,
        roleId: r.id,
      }));

    const toDelete = [...existingRoleIds].filter(
      (id) => !desiredRoleIds.has(id),
    );

    if (toInsert.length) {
      await this.db
        .insert(schema.userRole)
        .values(toInsert)
        .onConflictDoNothing();
    }

    if (toDelete.length) {
      await this.db
        .delete(schema.userRole)
        .where(
          and(
            eq(schema.userRole.userId, userId),
            inArray(schema.userRole.roleId, toDelete),
          ),
        );
    }

    return {
      roles: roleRecords.map((r) => r.name),
    };
  }

  async setPrimaryCampus(
    userId: number,
    dto: SetUserCampusDto,
    requester: AuthenticatedUser,
  ) {
    const superAdmin = this.isSuperAdmin(requester);
    const admin = this.isAdmin(requester);
    if (!superAdmin && !admin) {
      throw new ForbiddenException("Not permitted");
    }

    if (!superAdmin) {
      if (!requester.campusIds?.includes(dto.campus_id)) {
        throw new ForbiddenException("Campus access denied");
      }
    }

    const [campus] = await this.db
      .select({ id: schema.campuses.id })
      .from(schema.campuses)
      .where(eq(schema.campuses.id, dto.campus_id));
    if (!campus) {
      throw new NotFoundException("Campus not found");
    }

    const [user] = await this.db
      .update(schema.users)
      .set({ campusId: dto.campus_id })
      .where(eq(schema.users.id, userId))
      .returning({ id: schema.users.id });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.db
      .update(schema.userCampuses)
      .set({ isPrimary: false })
      .where(eq(schema.userCampuses.userId, userId));

    const [existingPrimary] = await this.db
      .select({ id: schema.userCampuses.id })
      .from(schema.userCampuses)
      .where(
        and(
          eq(schema.userCampuses.userId, userId),
          eq(schema.userCampuses.campusId, dto.campus_id),
        ),
      );

    if (existingPrimary) {
      await this.db
        .update(schema.userCampuses)
        .set({ isPrimary: true })
        .where(eq(schema.userCampuses.id, existingPrimary.id));
    } else {
      await this.db.insert(schema.userCampuses).values({
        userId,
        campusId: dto.campus_id,
        isPrimary: true,
      });
    }

    return { campus_id: dto.campus_id };
  }
}
