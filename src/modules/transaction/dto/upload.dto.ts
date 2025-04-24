import { IsNotEmpty } from "class-validator";

export class uploadDTO {
  @IsNotEmpty()
  readonly file!: any;
}
