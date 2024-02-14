export interface CouponDetails {
	couponCode: string;
	secretCode: string;
	encryptedCouponCode: string | null;
	email?: string;
}
