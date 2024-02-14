import mongoose from "mongoose";
import { type InstanceType } from "typegoose";

const RewardCategoriesSchema = new mongoose.Schema({
	name: {
		type: String,
		unique: true,
		required: true,
	},
});

export type RewardCategories = InstanceType<
	mongoose.InferSchemaType<typeof RewardCategoriesSchema>
>;

module.exports = mongoose.model("RewardCategories", RewardCategoriesSchema);
