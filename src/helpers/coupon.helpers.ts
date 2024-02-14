import crypto from "crypto";
import { encryptionConstants } from "../constants/encryption.constants";
import { logger } from "../logger/logger";
const { AES_256_CBC } = encryptionConstants;

/**
 * Encrypt the coupon details
 * @param {string} rewardPoints
 * @param {string} couponId
 * @returns {string} encryptedCouponCode
 */
export const cryptTheCoupon = (
	secretMessage: string,
	iv: crypto.BinaryLike,
): string | null => {
	const key = process.env.COUPON_SECRET_KEY;
	if (!key) {
		throw new Error("Coupon secret key env variable inaccessible");
	}
	try {
		const cipher = crypto.createCipheriv(AES_256_CBC, key, iv);
		let encrypted = cipher.update(secretMessage, "utf-8", "hex");
		encrypted += cipher.final("hex");
		return encrypted;
	} catch(e: any) {
		logger.error("Error while crypting the keys:" + e.message);
		return null;
	}
};
