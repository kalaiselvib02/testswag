import mongoose from "mongoose";
import { type InstanceType } from "typegoose";
import { SEQUENCE_NAMES } from "../constants/schema.constants";
import { getNextSequence } from "../helpers/db.helpers";
import { logger } from "../logger/logger";
const TransactionSchema = require("../schemas/transaction.schema");
const ProductSchema = require("../schemas/product.schema");

const OrderSchema = new mongoose.Schema({
	orderId: {
		type: Number,
	},
	employeeId: {
		type: Number,
		required: true,
	},
	transactionId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: "Transaction",
	},
	productId: {
		type: Number,
		required: true,
	},
	statusId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: "OrderHistory",
	},
	quantity: {
		type: Number,
		required: true,
	},
	customisation: {
		size: {
			type: String,
			required: false,
		},
		color: {
			type: String,
			required: false,
		},
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

export type Order = InstanceType<mongoose.InferSchemaType<typeof OrderSchema>>;

OrderSchema.pre("save", async function (this: Order, next) {
	logger.info("Entering Pre Save - Order Schema");
	try {
		this.orderId = await getNextSequence(SEQUENCE_NAMES.ORDERS);
		logger.info("Exiting Pre Save - Order Schema - Successfully");
	} catch (error) {
		throw new Error("Error in generating order id sequence");
	}
	next();
});

OrderSchema.post("save", async function (this: Order) {
	logger.info("Entering Post Save - Order Schema");
	try {
		const productObj = await ProductSchema.findOne({
			productId: this.productId,
		});
		await TransactionSchema.findOneAndUpdate(
			{ _id: this.transactionId },
			{
				description: `Purchase Order No ${this.orderId} - ${productObj.title}`,
			},
		);
	} catch (error) {
		logger.error("Error in updating transaction description when", error);
	}
});

module.exports = mongoose.model("Order", OrderSchema);
