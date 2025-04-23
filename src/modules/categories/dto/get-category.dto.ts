import { IsNotEmpty, IsString } from "class-validator";

export class GetCategorysDTO {
  @IsNotEmpty()
  @IsString()
  readonly slug!: string;
}
