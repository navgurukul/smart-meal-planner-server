import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";

export class CreateCampusChangeRequestDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @IsPositive()
  requested_campus_id: number;

  @ApiProperty({
    example: "Moving to new city",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
