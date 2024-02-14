export interface COItem {
	quantity: number;
	customisation: object;
	productDetails: {
		productId: number;
		title: string;
		rewardPoints: number;
		isCustomisable?: boolean;
		productImgURL?: string;
	};
}

export interface userDetails {
	employeeId: number;
	name: string;
	location: string;
}
