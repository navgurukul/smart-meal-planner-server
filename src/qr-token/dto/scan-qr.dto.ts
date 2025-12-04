import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class ScanQrDto {
  @ApiProperty({ example: "7b6b8d66-3b3d-4f3a-8c6e-abcdef123456" })
  @IsString()
  @Length(1, 255)
  token: string;
}
