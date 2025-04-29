import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { Location } from "../../../generated/prisma";

export class EventDTO {
  @IsNotEmpty()
  @IsNumber()
  readonly categoryId!: number;

  @IsNotEmpty()
  @IsNumber()
  readonly organizerId!: number;

  @IsString()
  slug!: string;

  @IsNotEmpty()
  @IsString()
  readonly name!: string;

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

  @IsNotEmpty()
  @IsString()
  readonly thumbnail!: string;
}
