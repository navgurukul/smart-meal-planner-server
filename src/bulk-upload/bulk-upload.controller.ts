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
  BadRequestException
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { requireRole } from "src/auth/guards/require-role.guard";
import type { RequestWithUser } from "src/middleware/auth.middleware";
import { BulkUploadService } from './bulk-upload.service';
import { studentDataDto } from "./dto/bulk-upload.dto";

@ApiTags("Bulk Upload")
@ApiBearerAuth("JWT-auth")
@Controller("bulk-upload")
export class BulkUploadController {
  constructor(
    private readonly bulkUploadService: BulkUploadService,
  ) {}

    @UseGuards(JwtAuthGuard, requireRole("SUPER_ADMIN"))
    @Post("/students")
    @ApiOperation({ summary: 'Add the student to the campus' })
    async addStudentToCampus(
        @Body() studentData: studentDataDto,
    ) {
        const [err, res] = await this.bulkUploadService.addStudentToCampus(
        studentData.students,
        );
        if (err) {
        throw new BadRequestException(err);
        }
        return res;
    }
}