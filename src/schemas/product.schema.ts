import mongoose from "mongoose";
import { getNextSequence } from "../helpers/db.helpers";
import { logger } from "../logger/logger";
import { type InstanceType } from "typegoose";
import { MONGO_CONSTANTS } from "../constants";

const ProductSchema = new mongoose.Schema({
	productId: {
		type: Number,
	},
	title: {
		type: String,
		required: true,
		unique: true,
	},
	rewardPoints: {
		type: Number,
		required: true,
	},
	isCustomisable: {
		type: Boolean,
		required: true,
		default: false,
	},
	productImgURL: {
		type: String,
		required: true,
		default: "",
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

export type Product = InstanceType<mongoose.InferSchemaType<typeof ProductSchema>>;

ProductSchema.pre("insertMany", async function (next, docs) {
	logger.info("Entering Pre Save - Product Schema");
	let products: Array<Promise<Product>>;
	try {
		if(docs.length && Array.isArray(docs)) {
			products = docs.map(async (product) => {
				return await new Promise(async (resolve, reject) => {
					product.productId = await getNextSequence(MONGO_CONSTANTS.COLLECTIONS.PRODUCTS);
					resolve(product);
				});
			});
		} else {
			return next(new Error("ProductSchema-PreHook : Empty Product List is Sent"));
		}
	} catch (error) {
		throw new Error("Error in generating product id sequence");
	}
	docs = await Promise.all(products);
	logger.info("Exiting Pre Save - Product Schema - Successfully");
	next();
});

module.exports = mongoose.model("Product", ProductSchema);
