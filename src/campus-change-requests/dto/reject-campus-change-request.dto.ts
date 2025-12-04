import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class RejectCampusChangeRequestDto {
  @ApiProperty({
    example: "Insufficient documentation",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejection_reason?: string;
}
