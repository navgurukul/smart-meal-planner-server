import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

export class AssignRolesDto {
  @ApiProperty({ example: ["ADMIN", "KITCHEN_STAFF"], isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles: string[];
}
