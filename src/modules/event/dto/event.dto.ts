import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { CategoryName, Location } from "../../../generated/prisma";
import { Transform } from "class-transformer";

export class EventDTO {
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  categoryId!: number;

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  readonly organizerId!: number;

  @IsNotEmpty()
  @IsString()
  readonly name!: string;

  @IsNotEmpty()
  @IsEnum(CategoryName)
  readonly category!: CategoryName;

  @IsNotEmpty()
  @IsString()
  readonly desc!: string;

  @IsNotEmpty()
  @IsString()
  readonly startDate!: string;

  @IsNotEmpty()
  @IsString()
  readonly endDate!: string;

  @IsNotEmpty()
  @IsEnum(Location)
  readonly location!: Location;
}
