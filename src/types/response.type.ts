export interface CustomResponse {
	status: string;
	code: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: any;
	json?: Record<string, unknown> | Array<Record<string, unknown>> | unknown[];
}

export interface OrderStatusChangeResponse {
	isSuccess: boolean,
	changedStatusTo?: string,
}