import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Type,
  UnauthorizedException,
  mixin,
} from "@nestjs/common";
import { RequestWithUser } from "src/middleware/auth.middleware";

export const requireRole = (...roles: string[]): Type<CanActivate> => {
  class RequireRoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<RequestWithUser>();
      const user = request.user;

      if (!user) {
        throw new UnauthorizedException("Authentication required");
      }

      if (!roles.length) {
        return true;
      }
      console.log('Required roles:', roles);
      console.log('User roles:', user.roles);
      const normalized = roles.map((r) => r.toUpperCase());
      const hasRole = user.roles?.some((role) =>
        normalized.includes(role.toUpperCase()),
      );
      if (!hasRole) {
        throw new ForbiddenException("Insufficient role");
      }

      return true;
    }
  }

  return mixin(RequireRoleGuard);
};
