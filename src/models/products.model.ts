export type Product = {
	productId?: number;
	title: string;
	rewardPoints: number;
	isCustomisable: boolean | string;
	productImgURL?: string;
	createdAt?: Date;
};
