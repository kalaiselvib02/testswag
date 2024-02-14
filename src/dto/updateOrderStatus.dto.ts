import { IsNotEmpty, IsInt, IsString, IsOptional, IsDefined, IsAlpha } from "class-validator";
import "reflect-metadata";
import { dbOrderStatus } from "../constants";

// This DTO is for all the status update except for the REJECTED
export class UpdateOrderStatusDTO {
	@IsInt()
    @IsNotEmpty()
	orderId: number;

	@IsString()
    @IsNotEmpty()
	changeTo: string;

	constructor(orderId: number, changeTo: string) {
		this.orderId = orderId;
		this.changeTo = changeTo;
	}
}

// This DTO is only for REJECTED, it requires additional key 'rejectReason'
export class RejectOrderStatusDTO extends UpdateOrderStatusDTO{

    @IsString()
    @IsNotEmpty()
	rejectReason: string;

	constructor(orderId: number, changeTo: string, rejectReason: string) {
        super(orderId, changeTo);
		this.rejectReason = rejectReason;
	}
}
