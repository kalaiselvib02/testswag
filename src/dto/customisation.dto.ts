import { IsNotEmpty, IsString, IsAlpha } from "class-validator";
import "reflect-metadata";
export class CustomisationDTO {

	@IsString({ message: "Expected value in string" })
	@IsAlpha()
	@IsNotEmpty({ message: "Size should not be empty" })
	size: string;

	@IsAlpha()
	@IsString({ message: "Expected value in string" })
	@IsNotEmpty({ message: "Color should not be empty" })
	color: string;

	constructor(size: string, color: string) {
		this.size = size;
		this.color = color;
	}
}
