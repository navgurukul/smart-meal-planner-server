import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsPositive,
  Matches,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

const mealSlots = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"] as const;
export type MealSlotName = (typeof mealSlots)[number];

class CampusSlotInput {
  @ApiProperty({ enum: mealSlots, example: "BREAKFAST" })
  @IsEnum(mealSlots)
  meal_slot: MealSlotName;

  @ApiProperty({ example: "07:30:00" })
  @Matches(/^\d{2}:\d{2}:\d{2}$/, {
    message: "start_time must be HH:MM:SS",
  })
  start_time: string;

  @ApiProperty({ example: "09:00:00" })
  @Matches(/^\d{2}:\d{2}:\d{2}$/, {
    message: "end_time must be HH:MM:SS",
  })
  end_time: string;

  @ApiProperty({ example: -12 })
  @IsInt()
  selection_deadline_offset_hours: number;
}

export class UpsertCampusMealSlotsDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  campus_id: number;

  @ApiProperty({ type: [CampusSlotInput] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CampusSlotInput)
  slots: CampusSlotInput[];
}
