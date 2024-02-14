export type Product = {
	_id?: object;
	productId: number;
	title: string;
	rewardPoints: number;
	isCustomisable: boolean;
	productImgURL?: string;
	createdAt?: Date;
};

export interface ProductResponseObject {
	_id?: string;
	productId: number;
	title: string;
	rewardPoints: number;
	isCustomisable: boolean;
	productImgURL?: string;
	createdAt?: Date;
	isErroneous?: boolean;
	isAlreadyPurchased?: boolean;
}
