import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { CampusChangeRequestsService } from "./campus-change-requests.service";
import { CreateCampusChangeRequestDto } from "./dto/create-campus-change-request.dto";
import { RejectCampusChangeRequestDto } from "./dto/reject-campus-change-request.dto";

@ApiTags("Campus Change Requests")
@ApiBearerAuth("JWT-auth")
@Controller("campus-change-requests")
export class CampusChangeRequestsController {
  constructor(
    private readonly campusChangeRequestsService: CampusChangeRequestsService,
  ) {}

  @UseGuards(JwtAuthGuard, requireRole("STUDENT"))
  @Post()
  create(
    @Body() body: CreateCampusChangeRequestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.campusChangeRequestsService.create(body, req.user!);
  }

  @UseGuards(JwtAuthGuard, requireRole("SUPER_ADMIN"))
  @Get()
  list(
    @Query("status") status: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.campusChangeRequestsService.list(
      status ? (status.toUpperCase() as any) : null,
      req.user!,
    );
  }

  @UseGuards(JwtAuthGuard, requireRole("SUPER_ADMIN"))
  @Post(":id/approve")
  approve(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.campusChangeRequestsService.approve(id, req.user!);
  }

  @UseGuards(JwtAuthGuard, requireRole("SUPER_ADMIN"))
  @Post(":id/reject")
  reject(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: RejectCampusChangeRequestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.campusChangeRequestsService.reject(id, body, req.user!);
  }
}
