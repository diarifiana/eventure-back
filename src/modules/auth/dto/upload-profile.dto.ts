import { IsNotEmpty } from "class-validator";

export class uploadProfileDTO {
  @IsNotEmpty()
  readonly file!: any;
}
