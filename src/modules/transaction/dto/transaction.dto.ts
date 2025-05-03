import { IsArray, IsBoolean, IsString } from "class-validator";

export class TransactionDTO {
  @IsArray()
  readonly details!: { ticketId: number; qty: number }[];

  @IsString()
  readonly referralCouponCode?: string;

  @IsString()
  readonly voucherCode?: string;

  @IsBoolean()
  readonly usePoints?: boolean;
}
