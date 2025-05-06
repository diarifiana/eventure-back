import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateBankDetailsDTO {
  @IsString()
  @IsOptional()
  readonly bankName?: string;

  @IsString()
  @IsOptional()
  readonly bankAccountNumber?: string;
  @IsString()
  @IsOptional()
  readonly bankAccountHolder?: string;
}
