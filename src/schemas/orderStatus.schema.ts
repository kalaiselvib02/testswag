import mongoose from "mongoose";

const OrderStatusSchema = new mongoose.Schema({
	status: {
		type: Number,
		unique: true,
		required: true,
	},
	name: {
		type: String,
		unique: true,
		required: true,
	},
});

module.exports = mongoose.model("OrderStatus", OrderStatusSchema);
