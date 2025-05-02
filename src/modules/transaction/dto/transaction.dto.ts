import { Transform } from "class-transformer";
import { IsNotEmpty, IsObject, IsString } from "class-validator";

export class TransactionDTO {
  @IsObject()
  readonly details!: { ticketId: number; qty: number }[];

  @IsString()
  readonly referralCouponCode?: string;

  @IsString()
  readonly voucherCode?: string;

  @IsString()
  readonly usePoints?: boolean;
}
