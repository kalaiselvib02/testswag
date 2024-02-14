import crypto from "crypto";
// helpers/pdf.helper.ts
export const COUPON_INPUT_DIR = "../constants/";
export const COUPON_INPUT_FILE = "PDFTemplate.ejs";
export const COUPON_OUTPUT_DIR = "../uploads/";
export const COUPON_PDF = (): string =>
	`coupon${crypto.randomBytes(4).toString("hex")}.pdf`;
export const COUPON_MERGED_PDF = (): string =>
	`coupons${crypto.randomBytes(4).toString("hex")}.pdf`;
