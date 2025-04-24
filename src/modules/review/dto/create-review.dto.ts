import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { Rating } from "../../../generated/prisma";

export class CreateReviewDTO {
  @IsNotEmpty()
  @IsNumber()
  readonly transactionId!: number;

  @IsNotEmpty()
  @IsString()
  readonly review!: string;

  @IsNotEmpty()
  @IsEnum(Rating)
  readonly rating!: Rating;
}
