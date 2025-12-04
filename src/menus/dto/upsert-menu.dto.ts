import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsPositive,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

const mealSlots = ["BREAKFAST", "LUNCH", "DINNER", "SNACKS"] as const;
export type MealSlotName = (typeof mealSlots)[number];

class MenuItemInput {
  @ApiProperty({ enum: mealSlots, example: "BREAKFAST" })
  @IsEnum(mealSlots)
  slot: MealSlotName;

  @ApiProperty({ example: 3 })
  @IsInt()
  @IsPositive()
  meal_item_id: number;
}

export class UpsertMenuDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  campus_id: number;

  @ApiProperty({ example: "2025-12-02" })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [MenuItemInput] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MenuItemInput)
  items: MenuItemInput[];
}
