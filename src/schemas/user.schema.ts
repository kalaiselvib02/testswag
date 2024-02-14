import mongoose from "mongoose";
import { type InstanceType } from "typegoose";
const uniqueValidator = require("mongoose-unique-validator");

const UserSchema = new mongoose.Schema({
	employeeId: {
		type: Number,
		unique: true,
		required: true,
	},
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
	},
	role: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "role",
		required: true,
	},
	location: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "location",
		required: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});
UserSchema.plugin(uniqueValidator);

export type User = InstanceType<mongoose.InferSchemaType<typeof UserSchema>>;

module.exports = mongoose.model("User", UserSchema);
