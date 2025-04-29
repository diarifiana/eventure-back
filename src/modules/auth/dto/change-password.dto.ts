import { IsNotEmpty, IsStrongPassword } from "class-validator";

export class ChangePasswordDTO {
  @IsNotEmpty()
  @IsStrongPassword()
  readonly oldPassword!: string;

  @IsNotEmpty()
  @IsStrongPassword()
  readonly newPassword!: string;
}
