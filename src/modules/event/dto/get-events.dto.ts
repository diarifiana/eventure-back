import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryParams } from "../../pagination/dto/pagination.dto";
import { CategoryName } from "../../../generated/prisma";

export class GetEventsDTO extends PaginationQueryParams {
  @IsOptional()
  @IsEnum(CategoryName)
  readonly category?: CategoryName;

  @IsOptional()
  @IsString()
  readonly search?: string;
}
