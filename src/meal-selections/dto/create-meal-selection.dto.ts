import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

const mealSlots = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const;
export type MealSlotName = (typeof mealSlots)[number];

class SelectionInput {
  @ApiProperty({ enum: mealSlots, example: "LUNCH" })
  @IsEnum(mealSlots)
  meal_slot: MealSlotName;

  @ApiProperty({ example: true })
  @IsBoolean()
  selected: boolean;
}

export class CreateMealSelectionDto {
  @ApiProperty({ example: "2025-12-03", required: false, description: "Single date; use from/to for range." })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ example: "2025-12-03", required: false })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ example: "2025-12-05", required: false })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ type: [SelectionInput] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SelectionInput)
  items: SelectionInput[];
}
