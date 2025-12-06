import { Controller, Get } from "@nestjs/common";
import { Public } from "src/auth/decorators/public.decorator";
import { CampusesService } from "./campuses.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Campuses")
@Controller("campuses")
export class CampusesController {
  constructor(private readonly campusesService: CampusesService) {}

  @Public()
  @Get()
  list() {
    return this.campusesService.list();
  }
}
