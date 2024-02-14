import mongoose from "mongoose";
const uniqueValidator = require("mongoose-unique-validator");

const ProductColor = new mongoose.Schema({
	color: {
		type: String,
		required: true,
		unique: true,
	},
});
ProductColor.plugin(uniqueValidator);
module.exports = mongoose.model("ProductColor", ProductColor);
