import { IsNotEmpty } from "class-validator";

export class uploadOrganizerDTO {
  @IsNotEmpty()
  readonly file!: any;
}
