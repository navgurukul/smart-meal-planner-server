import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "Jane Doe" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: "jane@example.com" })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  campus_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  role: string;

  @ApiProperty({ example: "123, MG Road, Bangalore", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiProperty({ example: "google-oauth-id", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  google_id?: string;

  @ApiProperty({
    example: "active",
    enum: ["active", "inactive"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["active", "inactive"], {
    message: 'status must be either "active" or "inactive"',
  })
  status?: "active" | "inactive";
}
