import { Transform } from "class-transformer";
import { IsNotEmpty } from "class-validator";

export class SingleTicketDTO {
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  readonly ticketId!: number;

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  readonly qty!: number;
}
