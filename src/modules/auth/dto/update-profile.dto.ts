import { IsString } from "class-validator";

export class UpdateProfileDTO {
  @IsString()
  readonly fullName?: string;

  @IsString()
  readonly userName?: string;

  @IsString()
  readonly email?: string;

  @IsString()
  readonly profilePic?: string;
}
