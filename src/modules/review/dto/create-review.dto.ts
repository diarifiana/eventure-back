import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { Rating } from "../../../generated/prisma";

export class CreateReviewDTO {
  @IsNotEmpty()
  @IsString()
  readonly review!: string;

  @IsNotEmpty()
  @IsEnum(Rating)
  readonly rating!: Rating;
}
