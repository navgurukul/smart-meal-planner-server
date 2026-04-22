import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
import { studentDataDto, updateStudentByIdDto } from "./dto/bulk-upload.dto";

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

    @UseGuards(JwtAuthGuard, requireRole("SUPER_ADMIN"))
    @Put("/students/:studentId")
    @ApiOperation({ summary: "Update student data by id" })
    async updateStudentById(
      @Param("studentId", ParseIntPipe) studentId: number,
      @Body() studentData: updateStudentByIdDto,
    ) {
      const [err, res] = await this.bulkUploadService.updateStudentById(
        studentId,
        studentData,
      );
      if (err) {
        throw new BadRequestException(err);
      }
      return res;
    }

    @UseGuards(JwtAuthGuard, requireRole("SUPER_ADMIN"))
    @Delete("/students/:studentId")
    @ApiOperation({ summary: "Delete student by id" })
    async deleteStudentById(
      @Param("studentId", ParseIntPipe) studentId: number,
      @Req() req: RequestWithUser,
    ) {
      const [err, res] = await this.bulkUploadService.deleteStudentById(
        studentId,
        req.user!,
      );
      if (err) {
        throw new BadRequestException(err);
      }
      return res;
    }
}