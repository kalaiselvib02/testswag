import mongoose from "mongoose";
import { type InstanceType } from "typegoose";
import { SEQUENCE_NAMES } from "../constants/schema.constants";
import { logger } from "../logger/logger";
import { getNextSequence } from "../helpers/db.helpers";

const JobLogSchema = new mongoose.Schema({
	// TO-DO: CouponCode(PublicKey) & SecretKey yet to be confirmed
    jobId: {
        type: Number,
		unique: true,
    },
	expirationDate: {
        type: Date,
        required: true,
    },
	isActive: {
        type: Boolean,
        default: true,
    },
    isCancelled: {
        type: Boolean,
        default: false,
    },
	isCompleted: {
		type: Boolean,
		default: false,
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

export type JobLog = InstanceType<mongoose.InferSchemaType<typeof JobLogSchema>>;

module.exports = mongoose.model("JobLog", JobLogSchema);