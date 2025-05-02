import { IsEnum, IsOptional, IsString } from "class-validator";
import { CategoryName, Location } from "../../../generated/prisma";

export class UpdateEventDTO {
  @IsOptional()
  @IsString()
  readonly name!: string;

  @IsOptional()
  @IsString()
  readonly desc!: string;

  @IsOptional()
  @IsString()
  readonly startDate!: string;

  @IsOptional()
  @IsString()
  readonly endDate!: string;

  @IsOptional()
  @IsEnum(Location)
  readonly category!: CategoryName;
  @IsOptional()
  @IsEnum(Location)
  readonly location!: Location;
}
