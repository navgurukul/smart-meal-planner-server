import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { MenusService } from "./menus.service";
import { UpsertMenuDto } from "./dto/upsert-menu.dto";

@ApiTags("Menus")
@ApiBearerAuth("JWT-auth")
@Controller("menus")
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @UseGuards(JwtAuthGuard, requireRole("ADMIN", "SUPER_ADMIN"))
  @Post()
  upsert(@Body() body: UpsertMenuDto, @Req() req: RequestWithUser) {
    return this.menusService.upsert(body, req.user!);
  }

  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: "campus_id", type: Number, required: true })
  @ApiQuery({ name: "from", type: String, required: true })
  @ApiQuery({ name: "to", type: String, required: true })
  @Get()
  getMenus(
    @Query("campus_id") campusId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.menusService.getMenus(
      campusId ? Number(campusId) : (undefined as any),
      from ?? "",
      to ?? "",
      req.user!,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: "campus_id", type: Number, required: true })
  @ApiQuery({ name: "from", type: String, required: true })
  @ApiQuery({ name: "to", type: String, required: true })
  @Get("me")
  getMenusWithSelection(
    @Query("campus_id") campusId: string | undefined,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.menusService.getMenuWithSelections(
      campusId ? Number(campusId) : (undefined as any),
      from ?? "",
      to ?? "",
      req.user!,
    );
  }
}
