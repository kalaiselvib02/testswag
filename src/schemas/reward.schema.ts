import moment from "moment";
import mongoose, { Date } from "mongoose";

const RewardSchema = new mongoose.Schema(
	{
		encryptedCouponCode: {
			type: String,
			required: true,
		},
		isCouponExpired: {
			type: Boolean,
			default: false,
		},
		transactionId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Transaction",
		},
		rewardee: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
		rewardCategory: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: "RewardCategories",
			populate: { select: "name" },
		},
		description: {
			type: String,
			required: true,
		},
		rewardPoints: {
			type: Number,
			required: true,
		},
		addedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
	},
	{
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	},
);

RewardSchema.virtual("createdAtVal").get(function () {
	return moment(this.createdAt).format("DD MMM YYYY");
});

module.exports = mongoose.model("Reward", RewardSchema);


// import moment from "moment";
// import mongoose, { Date } from "mongoose";

// const RewardSchema = new mongoose.Schema(
// 	{
// 		transactionId: {
// 			type: mongoose.Schema.Types.ObjectId,
// 			ref: "Transaction",
// 			required: true,
// 		},
// 		addedBy: {
// 			type: mongoose.Schema.Types.ObjectId,
// 			required: true,
// 			ref: "User",
// 		},
// 		rewardee: {
// 			type: mongoose.Schema.Types.ObjectId,
// 			required: true,
// 			ref: "User",
// 		},
// 		rewardCategory: {
// 			type: mongoose.Schema.Types.ObjectId,
// 			required: true,
// 			ref: "RewardCategories",
// 			populate: { select: "name" },
// 		},
// 		description: {
// 			type: String,
// 			required: true,
// 		},
// 		rewardPoints: {
// 			type: Number,
// 			required: true,
// 		},
// 		createdAt: {
// 			type: Date,
// 			default: Date.now,
// 		},
// 	},
// 	{
// 		toJSON: { virtuals: true },
// 		toObject: { virtuals: true },
// 	},
// );

// RewardSchema.virtual("createdAtVal").get(function () {
// 	return moment(this.createdAt).format("DD MMM YYYY");
// });

// module.exports = mongoose.model("Reward", RewardSchema);
