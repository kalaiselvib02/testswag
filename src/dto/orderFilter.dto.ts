import { IsOptional, IsInt, IsArray } from "class-validator";
import "reflect-metadata";
export class OrderFilterDTO {
	@IsInt()
	@IsOptional()
	employeeId?: number;

	@IsArray()
	@IsOptional()
	status?: string[];

	@IsArray()
	@IsOptional()
	location?: string[];

	constructor(employeeId: number, status: string[], location: string[]) {
		this.employeeId = employeeId;
		this.status = status;
		this.location = location;
	}
}
