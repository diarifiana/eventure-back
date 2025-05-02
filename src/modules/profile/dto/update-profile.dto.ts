import { IsOptional, IsString } from "class-validator";

export class UpdateProfileDTO {
  @IsString()
  @IsOptional()
  readonly fullName?: string;

  @IsString()
  @IsOptional()
  readonly userName?: string;
}
