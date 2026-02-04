import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Inject, ForbiddenException } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB } from "src/meal-items/db/constant";
import * as schema from "src/schema/schema";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name?: string | null;
  campusId?: number | null;
  campusIds: number[];
  roles: string[];
  status?: string | null;
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async use(req: RequestWithUser, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      this.logger.debug(
        `No bearer token on request; authorization header: ${authHeader ?? "undefined"}`,
      );
      return next();
    }

    const token = authHeader.slice("Bearer ".length);

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET_KEY,
      });

      const [user] = await this.db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          campusId: schema.users.campusId,
          status: schema.users.status,
        })
        .from(schema.users)
        .where(eq(schema.users.id, payload.sub));

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const roleRows = await this.db
        .select({ roleName: schema.roles.name })
        .from(schema.userRole)
        .innerJoin(schema.roles, eq(schema.userRole.roleId, schema.roles.id))
        .where(eq(schema.userRole.userId, user.id));

      const campusRows = await this.db
        .select({ campusId: schema.userCampuses.campusId })
        .from(schema.userCampuses)
        .where(eq(schema.userCampuses.userId, user.id));

      const campusIds = Array.from(
        new Set(
          [
            ...campusRows.map((c) => c.campusId),
            user.campusId,
          ].filter((c): c is number => typeof c === "number"),
        ),
      );

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        campusId: user.campusId,
        campusIds,
        roles: roleRows.map((r) => r.roleName?.toUpperCase() ?? "").filter(Boolean),
        status: user.status,
      };
    } catch (error) {
      this.logger.warn(`Auth middleware failed: ${error?.message ?? error}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid or expired token");
    }

    return next();
  }
}
