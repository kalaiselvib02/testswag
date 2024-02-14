import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
	id: {
		type: Number,
		required: true,
	},
	role: {
		type: Number,
		unique: true,
		required: true,
	},
});

module.exports = mongoose.model("Role", RoleSchema);
