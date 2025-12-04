import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common/decorators";
import { and, eq, inArray } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/db/constant";
import type { AuthenticatedUser } from "src/middleware/auth.middleware";
import * as schema from "src/schema/schema";
import { CreateCampusChangeRequestDto } from "./dto/create-campus-change-request.dto";
import { RejectCampusChangeRequestDto } from "./dto/reject-campus-change-request.dto";

type CampusChangeStatus = "PENDING" | "APPROVED" | "REJECTED";

@Injectable()
export class CampusChangeRequestsService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private ensureSuperAdmin(user: AuthenticatedUser) {
    if (!user.roles?.includes("SUPER_ADMIN")) {
      throw new ForbiddenException("Super admin only");
    }
  }

  private async resolvePrimaryCampusId(userId: number) {
    const [primary] = await this.db
      .select({ campusId: schema.userCampuses.campusId })
      .from(schema.userCampuses)
      .where(
        and(
          eq(schema.userCampuses.userId, userId),
          eq(schema.userCampuses.isPrimary, true),
        ),
      );

    if (primary?.campusId) {
      return primary.campusId;
    }

    const [fallback] = await this.db
      .select({ campusId: schema.users.campusId })
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    return fallback?.campusId ?? null;
  }

  private async assertCampusExists(campusId: number) {
    const [campus] = await this.db
      .select({ id: schema.campuses.id })
      .from(schema.campuses)
      .where(eq(schema.campuses.id, campusId));
    if (!campus) {
      throw new NotFoundException("Campus not found");
    }
  }

  async create(
    dto: CreateCampusChangeRequestDto,
    requester: AuthenticatedUser,
  ) {
    if (!requester.roles?.includes("STUDENT")) {
      throw new ForbiddenException("Only students can request campus change");
    }

    const currentCampusId = await this.resolvePrimaryCampusId(requester.id);
    if (!currentCampusId) {
      throw new BadRequestException("Current campus not set for user");
    }

    await this.assertCampusExists(dto.requested_campus_id);

    if (dto.requested_campus_id === currentCampusId) {
      throw new BadRequestException("Requested campus is same as current");
    }

    const [record] = await this.db
      .insert(schema.campusChangeRequests)
      .values({
        userId: requester.id,
        currentCampusId,
        requestedCampusId: dto.requested_campus_id,
        reason: dto.reason,
        status: "PENDING",
      })
      .returning({
        id: schema.campusChangeRequests.id,
        status: schema.campusChangeRequests.status,
        requestedCampusId: schema.campusChangeRequests.requestedCampusId,
        currentCampusId: schema.campusChangeRequests.currentCampusId,
        createdAt: schema.campusChangeRequests.createdAt,
      });

    return record;
  }

  async list(
    status: CampusChangeStatus | null,
    requester: AuthenticatedUser,
  ) {
    this.ensureSuperAdmin(requester);

    const allowedStatus: CampusChangeStatus[] = [
      "PENDING",
      "APPROVED",
      "REJECTED",
    ];

    const filterStatus = status
      ? (status.toUpperCase() as CampusChangeStatus)
      : null;

    if (filterStatus && !allowedStatus.includes(filterStatus)) {
      throw new BadRequestException("Invalid status filter");
    }

    return this.db
      .select({
        id: schema.campusChangeRequests.id,
        userId: schema.campusChangeRequests.userId,
        currentCampusId: schema.campusChangeRequests.currentCampusId,
        requestedCampusId: schema.campusChangeRequests.requestedCampusId,
        reason: schema.campusChangeRequests.reason,
        rejectionReason: schema.campusChangeRequests.rejectionReason,
        status: schema.campusChangeRequests.status,
        reviewedBy: schema.campusChangeRequests.reviewedBy,
        reviewedAt: schema.campusChangeRequests.reviewedAt,
        createdAt: schema.campusChangeRequests.createdAt,
      })
      .from(schema.campusChangeRequests)
      .where(
        filterStatus
          ? eq(schema.campusChangeRequests.status, filterStatus)
          : undefined,
      );
  }

  async approve(id: number, requester: AuthenticatedUser) {
    this.ensureSuperAdmin(requester);

    const [request] = await this.db
      .select()
      .from(schema.campusChangeRequests)
      .where(eq(schema.campusChangeRequests.id, id));

    if (!request) {
      throw new NotFoundException("Request not found");
    }
    if (request.status !== "PENDING") {
      throw new BadRequestException("Only pending requests can be approved");
    }

    await this.assertCampusExists(request.requestedCampusId);

    // Update user's primary campus
    await this.db
      .update(schema.users)
      .set({ campusId: request.requestedCampusId })
      .where(eq(schema.users.id, request.userId));

    await this.db
      .update(schema.userCampuses)
      .set({ isPrimary: false })
      .where(eq(schema.userCampuses.userId, request.userId));

    const [existingLink] = await this.db
      .select({ id: schema.userCampuses.id })
      .from(schema.userCampuses)
      .where(
        and(
          eq(schema.userCampuses.userId, request.userId),
          eq(
            schema.userCampuses.campusId,
            request.requestedCampusId,
          ),
        ),
      );

    if (existingLink) {
      await this.db
        .update(schema.userCampuses)
        .set({ isPrimary: true })
        .where(eq(schema.userCampuses.id, existingLink.id));
    } else {
      await this.db.insert(schema.userCampuses).values({
        userId: request.userId,
        campusId: request.requestedCampusId,
        isPrimary: true,
      });
    }

    const [updated] = await this.db
      .update(schema.campusChangeRequests)
      .set({
        status: "APPROVED",
        reviewedBy: requester.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      })
      .where(eq(schema.campusChangeRequests.id, id))
      .returning({
        id: schema.campusChangeRequests.id,
        status: schema.campusChangeRequests.status,
        reviewedBy: schema.campusChangeRequests.reviewedBy,
        reviewedAt: schema.campusChangeRequests.reviewedAt,
      });

    return updated;
  }

  async reject(
    id: number,
    dto: RejectCampusChangeRequestDto,
    requester: AuthenticatedUser,
  ) {
    this.ensureSuperAdmin(requester);

    const [request] = await this.db
      .select()
      .from(schema.campusChangeRequests)
      .where(eq(schema.campusChangeRequests.id, id));

    if (!request) {
      throw new NotFoundException("Request not found");
    }
    if (request.status !== "PENDING") {
      throw new BadRequestException("Only pending requests can be rejected");
    }

    const [updated] = await this.db
      .update(schema.campusChangeRequests)
      .set({
        status: "REJECTED",
        reviewedBy: requester.id,
        reviewedAt: new Date(),
        rejectionReason: dto.rejection_reason ?? null,
      })
      .where(eq(schema.campusChangeRequests.id, id))
      .returning({
        id: schema.campusChangeRequests.id,
        status: schema.campusChangeRequests.status,
        reviewedBy: schema.campusChangeRequests.reviewedBy,
        reviewedAt: schema.campusChangeRequests.reviewedAt,
        rejectionReason: schema.campusChangeRequests.rejectionReason,
      });

    return updated;
  }
}
