import { ApiProperty, ApiResponseProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
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
  email!: string;

  @ApiProperty({
    type: String,
    example: 'example',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    type: String,
    example: 'campusA',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  campus_name!: string;
}

export class updateStudentByIdDto {
  @ApiProperty({
    type: String,
    example: 'example',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    type: String,
    example: 'campusA',
    required: false,
  })
  @IsOptional()
  @IsString()
  campus_name?: string;

  @ApiProperty({
    type: Number,
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  campus_id?: number;
}

export class studentDataDto {
  @ApiProperty({
    type: [studentData],
    required: true,
  })
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => studentData)
  students!: studentData[];
}
