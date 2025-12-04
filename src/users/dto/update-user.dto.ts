import { PartialType } from "@nestjs/mapped-types";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  campus_id?: number;

  @ApiPropertyOptional({ example: "active", enum: ["active", "inactive"] })
  @IsOptional()
  @IsEnum(["active", "inactive"], {
    message: 'status must be either "active" or "inactive"',
  })
  status?: "active" | "inactive";

  @ApiPropertyOptional({ example: "Updated address" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;
}
