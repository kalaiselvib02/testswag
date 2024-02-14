import mongoose from "mongoose";
const OrderHistoryArray = require('../types/order.type');

const OrderHistorySchema = new mongoose.Schema({
	status: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		ref: "OrderStatus",
	},
	history: [OrderHistoryArray],
});

module.exports = mongoose.model("OrderHistory", OrderHistorySchema);
