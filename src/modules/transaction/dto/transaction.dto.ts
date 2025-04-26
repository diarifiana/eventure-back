import { IsEnum, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { Status } from "../../../generated/prisma";

export class TransactionDTO {
  @IsNotEmpty()
  @IsNumber()
  readonly userId!: number;

  @IsNotEmpty()
  @IsNumber()
  readonly ticketId!: number;

  @IsNotEmpty()
  @IsNumber()
  readonly qty!: number;

  @IsString()
  readonly referralCouponCode?: string;

  @IsString()
  readonly voucherCode?: string;

  @IsString()
  readonly usePoints?: boolean;

  @IsNumber()
  readonly totalAmount?: number;

  @IsEnum(Status)
  readonly status?: Status;

  @IsString()
  readonly paymentProof?: string;
}
