import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsPositive } from "class-validator";

export class SetUserCampusDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  campus_id: number;
}
