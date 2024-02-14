import mongoose from "mongoose";
const uniqueValidator = require("mongoose-unique-validator");
const LocationSchema = new mongoose.Schema({
	name: {
		type: String,
		unique: true,
		required: true,
		uniqueCaseInsensitive: true,
	},
});
LocationSchema.plugin(uniqueValidator);
module.exports = mongoose.model("Location", LocationSchema);
