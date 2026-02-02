import { ApiProperty, ApiResponseProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsEmail,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class studentData {
  @ApiProperty({
    type: String,
    example: 'example@gmail.com',
    required: true,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    type: String,
    example: 'example',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    type: String,
    example: 'campusA',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  campus_name: string;
}
export class studentDataDto {
  @ApiProperty({
    type: [studentData],
    required: true,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => studentData)
  students: studentData[];
}