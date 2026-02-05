import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
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
import { ApiBody, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Public } from "src/auth/decorators/public.decorator";
import { SelfUpdateDto } from "./dto/self-update.dto";

@ApiTags("Users")
// Swagger security scheme name must match the one defined in DocumentBuilder (`JWT-auth`).
@ApiBearerAuth("JWT-auth")
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("all")
  @ApiOperation({ summary: "List all users (any authenticated role)" })
  listAll(@Req() req: RequestWithUser) {
    return this.usersService.listAllBasic();
  }

  @Public()
  @Post("register")
  @ApiBody({ type: CreateUserDto })
  @ApiOperation({ summary: "Self-register as student" })
  selfRegister(@Body() body: CreateUserDto) {
    return this.usersService.selfRegister(body);
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @Get("all/admins")
  @ApiOperation({ summary: "List all admins (super-admin only)" })
  @ApiQuery({ name: "campus_id", required: false, type: Number })
  @ApiQuery({
    name: 'searchTerm',
    required: false,
    type: String,
    description: 'Search by name or id in bootcamps',
  })
  listAllAdmins(
    @Req() req: RequestWithUser,
    @Query("role") role: string,
    @Query("campus_id") campusId?: string,
    @Query('searchTerm') searchTerm?: string,
  ) {
    const parsedCampusId = campusId ? Number(campusId) : null;
    const searchTermAsNumber = !isNaN(Number(searchTerm))
      ? Number(searchTerm)
      : searchTerm;
    return this.usersService.allAdmins(
      Number.isNaN(parsedCampusId) ? null : parsedCampusId,
      role,
      req.user!,
      searchTermAsNumber,
    );
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @Post()
  @ApiBody({ type: CreateUserDto })
  @ApiOperation({ summary: "Create a user (admin/super-admin)" })
  create(
    @Body() body: CreateUserDto,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.createUser(body, req.user!);
  }

  @UseGuards(JwtAuthGuard)
  @Post("me/campus")
  @ApiBody({ type: SetUserCampusDto })
  @ApiOperation({ summary: "Set my campus (self-serve)" })
  setMyCampus(@Body() body: SetUserCampusDto, @Req() req: RequestWithUser) {
    return this.usersService.setMyCampus(req.user!.id, body.campus_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("me")
  @ApiBody({ type: SelfUpdateDto })
  @ApiOperation({ summary: "Update my profile (self-serve)" })
  updateMe(@Body() body: SelfUpdateDto, @Req() req: RequestWithUser) {
    return this.usersService.selfUpdate(req.user!.id, body);
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @Get()
  @ApiOperation({ summary: "List all students (admin/super-admin) by campus" })
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
  @ApiBody({ type: UpdateUserDto })
  @ApiOperation({ summary: "Update user details (admin/super-admin)" })
  @Post(":userId")
  updateUser(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() body: UpdateUserDto,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.updateUser(userId, body, req.user!);
  }

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @ApiOperation({ summary: "Delete user (admin/super-admin)" })
  @Delete(":userId/delete")
  deleteUser(
  @Param('userId', ParseIntPipe) userId: number,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.deleteUser(userId, req.user!);
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
