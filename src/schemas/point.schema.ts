import mongoose from "mongoose";
import { type InstanceType } from "typegoose";

const PointSchema = new mongoose.Schema({
	employeeId: {
		type: Number,
		required: true,
		unique: true,
	},
	total: {
		type: Number,
		required: true,
		default: 0,
	},
	redeemed: {
		type: Number,
		required: true,
		default: 0,
	},
	available: {
		type: Number,
		required: true,
		default: 0,
	},
});

export type Point = InstanceType<mongoose.InferSchemaType<typeof PointSchema>>;

module.exports = mongoose.model("Point", PointSchema);
