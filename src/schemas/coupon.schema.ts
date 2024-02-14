import mongoose from "mongoose";
import { type InstanceType } from "typegoose";
const { randomUUID } = require("crypto");

const CouponSchema = new mongoose.Schema({
	// TO-DO: CouponCode(PublicKey) & SecretKey yet to be confirmed
	// couponId: {
	// 	type: String,
    //     unique: true,
	// 	required: true,
	// },
    couponCode: {
        type: String,
        min: 5,
        trim: true,
        unique: true,
        required: true,
    },
	rewardPoints: {
		type: Number,
		required: true,
	},
	addedBy: {
		type: Number,
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

export type Coupon = InstanceType<mongoose.InferSchemaType<typeof CouponSchema>>;

module.exports = mongoose.model("Coupon", CouponSchema);
