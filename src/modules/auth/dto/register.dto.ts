import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
} from "class-validator";

export class RegisterDTO {
  @IsNotEmpty()
  @IsString()
  readonly fullName!: string;

  @IsNotEmpty()
  @IsString()
  readonly userName!: string;

  @IsNotEmpty()
  @IsEmail()
  readonly email!: string;

  @IsNotEmpty()
  @IsStrongPassword()
  readonly password!: string;

  @IsString()
  @IsOptional()
  referralUsed?: string;

  @IsString()
  @IsOptional()
  readonly organizerName?: string;
}
