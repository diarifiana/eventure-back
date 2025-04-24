import { IsDate, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateVoucherDTO {
  @IsNotEmpty()
  @IsNumber()
  readonly eventId!: number;

  @IsNotEmpty()
  @IsString()
  readonly code!: string;

  @IsNotEmpty()
  @IsNumber()
  readonly discountAmount!: number;

  @IsNotEmpty()
  @IsDate()
  readonly startDate!: Date;

  @IsNotEmpty()
  @IsDate()
  readonly endDate!: Date;

  @IsNotEmpty()
  @IsNumber()
  readonly qty!: number;
}
