import { IsOptional, IsString, IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class MealHistoryQueryDto {
  @ApiProperty({
    description: "Start date for the range",
    example: "2025-01-01",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({
    description: "End date for the range",
    example: "2025-12-31",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({
    description: "Filter by meal slot (BREAKFAST, LUNCH, SNACKS, DINNER)",
    example: "BREAKFAST",
    required: false,
  })
  @IsOptional()
  @IsString()
  slot?: string;

  @ApiProperty({
    description: "Filter by campus ID (admin only)",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsString()
  campusId?: string;
}
