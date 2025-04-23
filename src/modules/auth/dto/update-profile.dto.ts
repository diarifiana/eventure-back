import { IsString } from "class-validator";

export class UpdateProfileDTO {
  @IsString()
  fullName!: string;
}
