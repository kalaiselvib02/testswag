import { ValidateNested, IsArray, ArrayNotEmpty } from "class-validator";
import { OrderDTO } from "./order.dto";
import { Type } from "class-transformer";
import "reflect-metadata";

export class OrdersListDTO {
	@IsArray()
	@ArrayNotEmpty({ message: "Order List should not be empty" })
	@ValidateNested({ each: true })
	@Type(() => OrderDTO)
	orderItems: OrderDTO[];

	constructor(orderItems :any) {
		this.orderItems = orderItems.map((order:OrderDTO) => new OrderDTO(order));
	}
}
