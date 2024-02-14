import {
	IsNotEmpty,
	IsInt,
	ValidateNested,
	IsNumber,
	IsString,
	IsDefined,
	IsOptional,
	ValidateIf,
	IsNotEmptyObject,
	IsObject
} from "class-validator";
import "reflect-metadata";
import { Type } from "class-transformer";
import { CustomisationDTO } from "./customisation.dto";

export class OrderDTO {
	@IsInt({ message: "Product Id should be an int" })
	@IsNotEmpty({ message: "ProductId should not be empty" })
	productId: number;

	@IsInt({ message: "Quantity should be an Int" })
	@IsNotEmpty({ message: "Quantity should not be empty" })
	quantity: number;

	@IsOptional()
	@IsNotEmptyObject()
	@ValidateNested({always: true,each: true })
	@Type(() => CustomisationDTO)
	customisation: CustomisationDTO;

	constructor(order : OrderDTO) {
		this.productId = order.productId;
		this.quantity = order.quantity;
		if(order?.customisation && Object.keys(order?.customisation).length > 0) {
			this.customisation = new CustomisationDTO(order.customisation.size,order.customisation.color);
		} else {
			this.customisation = order?.customisation;
		}
	}
}

export class CancelOrder {
	@IsNumber()
	orderId: number;

	@IsString()
	changeTo: string;

	constructor(orderId: number, changeTo: string) {
		this.orderId = orderId;
		this.changeTo = changeTo;
	}
}
