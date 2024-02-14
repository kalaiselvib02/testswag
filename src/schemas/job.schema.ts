import mongoose from "mongoose";
import { type InstanceType } from "typegoose";
import { SEQUENCE_NAMES } from "../constants/schema.constants";
import { logger } from "../logger/logger";
import { getNextSequence } from "../helpers/db.helpers";
const JobLogSchema = require("./jobLog.schema");

const JobSchema = new mongoose.Schema({
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

export type Job = InstanceType<mongoose.InferSchemaType<typeof JobSchema>>;

JobSchema.pre("save", async function (this: Job, next) {
	logger.info("Entering Pre Save - Job Schema");
	try {
		this.jobId = await getNextSequence(SEQUENCE_NAMES.JOBS);
		logger.info("Exiting Pre Save - Job Schema - Successfully");
	} catch (error) {
		throw new Error("Error in generating job id sequence");
	}
	next();
});

JobSchema.post("save", async function (this: Job) {
	logger.info("Entering Post Save - Job Schema");
	try {
		const JobLog = await JobLogSchema.create({
			jobId: this.jobId, 
			expirationDate: this.expirationDate,
			isActive: true,
			isCancelled: false,
			addedBy: this.addedBy,
		});
	} catch (error) {
		logger.error("Error in updating Job Logs when", error);
		throw new Error("JobSchema Post Hook ERROR:"+error);
	}
	logger.info("Exiting Post Save - Job Schema");
});

module.exports = mongoose.model("Job", JobSchema);