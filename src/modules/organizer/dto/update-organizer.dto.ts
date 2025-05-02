import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateOrganizerDTO {
  @IsString()
  @IsOptional()
  readonly name?: string;

  @IsString()
  @IsOptional()
  readonly aboutUs?: string;
}
