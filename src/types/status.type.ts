export interface Status {
	_id?: object;
	status: number;
	name: string;
}

export interface StatusMailObject {
	userName: string;
	userBalance: number;
	orderNo: number;
	orderUpdatedStatus: string;
	productTitle: string;
	quantity: number;
	totalPoints: number;
	rejectionReason?: string;
	productImgURL?: string;
	rewardPoints?: number;
}
