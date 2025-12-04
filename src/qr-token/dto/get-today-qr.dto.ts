import { IsInt, IsPositive } from "class-validator";

export class GetTodayQrDto {
  @IsInt()
  @IsPositive()
  campus_id: number;
}
