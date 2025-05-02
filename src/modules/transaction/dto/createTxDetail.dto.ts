import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class createTxDetailTO {
  @IsNotEmpty()
  @IsString()
  readonly transactionId!: string;

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  ticketId!: number;

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  qty!: number;
}
