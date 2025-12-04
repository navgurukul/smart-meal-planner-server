import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { AssignRolesDto } from "./dto/assign-roles.dto";
import { SetUserCampusDto } from "./dto/set-user-campus.dto";
import { UsersService } from "./users.service";
import { ApiBody } from "@nestjs/swagger";

@ApiTags("Users")
// Swagger security scheme name must match the one defined in DocumentBuilder (`JWT-auth`).
@ApiBearerAuth("JWT-auth")
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @Get()
  list(
    @Req() req: RequestWithUser,
    @Query("campus_id") campusId?: string,
  ) {
    const parsedCampusId = campusId ? Number(campusId) : null;
    return this.usersService.listUsers(
      Number.isNaN(parsedCampusId) ? null : parsedCampusId,
      req.user!,
    );
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @Post(":userId/roles")
  @ApiBody({ type: AssignRolesDto })
  assignRoles(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() body: AssignRolesDto,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.assignRoles(userId, body, req.user!);
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @Post(":userId/campus")
  @ApiBody({ type: SetUserCampusDto })
  setCampus(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() body: SetUserCampusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.setPrimaryCampus(userId, body, req.user!);
  }
}
