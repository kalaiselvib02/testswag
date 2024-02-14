import mongoose from "mongoose";
import { type InstanceType } from "typegoose";

const CounterSchema = new mongoose.Schema({
	_id: { type: String, required: true },
	seq: { type: Number, default: 0 },
});

export type Counter = InstanceType<mongoose.InferSchemaType<typeof CounterSchema>>;

module.exports = mongoose.model("counter", CounterSchema);
