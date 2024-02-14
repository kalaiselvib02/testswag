import mongoose from "mongoose";
const uniqueValidator = require("mongoose-unique-validator");

const ProductSize = new mongoose.Schema({
	size: {
		type: String,
		required: true,
		unique: true,
	},
});
ProductSize.plugin(uniqueValidator);
module.exports = mongoose.model("ProductSize", ProductSize);
