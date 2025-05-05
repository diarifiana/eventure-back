import { Type } from "class-transformer";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { CategoryName, Location } from "../../../generated/prisma";

export class EventDTO {
  @IsNotEmpty()
  @IsEnum(CategoryName)
  readonly category!: CategoryName;

  @IsNotEmpty()
  @IsString()
  readonly name!: string;

  @IsNotEmpty()
  @IsString()
  readonly desc!: string;

  @IsNotEmpty()
  @Type(() => Date)
  readonly startDate!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  readonly endDate!: Date;

  @IsNotEmpty()
  @IsEnum(Location)
  readonly location!: Location;
}
