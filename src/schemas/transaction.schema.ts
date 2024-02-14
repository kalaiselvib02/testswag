import mongoose, { type Model } from "mongoose";
import { SEQUENCE_NAMES, minusSign, plusSign } from "../constants/schema.constants";
import { getNextSequence, getPointsById } from "../helpers/db.helpers";
import { type Point } from "./point.schema";
import { logger } from "../logger/logger";
import moment from "moment";
const PointModel: Model<Point> = require("../schemas/point.schema");

const TransactionSchema = new mongoose.Schema(
	{
		transactionId: {
			type: Number,
		},
		employeeId: {
			type: Number,
			required: true,
		},
		description: {
			type: String,
			// required: true,
		},
		isCredited: {
			type: Boolean,
			required: true,
			default: false,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		amount: {
			type: Number,
			required: true,
		},
		balance: {
			type: Number,
			required: true,
			default: 0,
		},
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	},
);

export type Transaction = mongoose.InferSchemaType<typeof TransactionSchema>;
/**
 * purpose : to save point object after calculating
 */
TransactionSchema.pre("save", async function (this: Transaction, next) {
	try {
		let pointObject: Point | null = await getPointsById(this.employeeId);
		if (!pointObject && this.isCredited) {
			pointObject = await PointModel.create({
				employeeId: this.employeeId,
				total: this.amount,
				available: this.amount,
			});
		} else if (pointObject) {
			if (this.isCredited) {
				pointObject.total = pointObject.total + this.amount;
			} else {
				pointObject.redeemed = pointObject.redeemed + this.amount;
			}
			pointObject.available = pointObject.total - pointObject.redeemed;
			await pointObject.save();
		}
		if (pointObject?.total) {
			this.balance = pointObject.available;
		}
		this.transactionId = await getNextSequence(SEQUENCE_NAMES.TRANSACTION);
		next();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (err: any) {
		logger.error(
			"Error while manipulating point object for employeeId:" +
			this.employeeId +
			err,
		);
		next(err);
	}
	next();
});

/**
 * purpose : formatting : amount for display
 */
TransactionSchema.virtual("displayAmount").get(function () {
	const sign: string = this.isCredited ? plusSign : minusSign;
	return sign + this.amount;
})
/**
 * purpose : formatting : transaction id for display
 */
TransactionSchema.virtual("displayTransactionId").get(function () {
	let formattedTransactionId: string;
	if (this.transactionId!.toString().length < 8) {
		formattedTransactionId = `T${new Array(8 - this.transactionId!.toString().length).join('0')}${this.transactionId}`;
	} else {
		formattedTransactionId = `T${this.transactionId}`;
	}
	return formattedTransactionId;
});
/**
 * purpose : formatting : date for display
 */
TransactionSchema.virtual("date").get(function () {
	return moment(this.createdAt).format("DD MMM YYYY");
});

module.exports = mongoose.model("Transaction", TransactionSchema);
