import { Transform, Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateTicketDTO {
  @IsNotEmpty()
  @IsString()
  readonly eventName!: string;

  @IsNotEmpty()
  @IsString()
  readonly ticketType!: string;

  @IsNotEmpty()
  @Type(() => Number)
  price!: number;

  @IsNotEmpty()
  @Type(() => Number)
  qty!: number;
}
