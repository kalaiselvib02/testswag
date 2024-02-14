import { IsNumber } from "class-validator";
import "reflect-metadata";
export class RemoveCartItemDTO {
	@IsNumber()
	productId: number;

	constructor(productId: number) {
		this.productId = productId;
	}
}
