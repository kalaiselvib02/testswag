import mongoose from "mongoose";
import { type InstanceType } from "typegoose";
import { logger } from "../logger/logger";
const ProductSchema = require("../schemas/product.schema");


const CartSchema = new mongoose.Schema({
  employeeId: {
    type: Number,
    required: true,
  },
  productId: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  customisation : {
    type: Object
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export type Cart = InstanceType<mongoose.InferSchemaType<typeof CartSchema>>;

module.exports = mongoose.model("Cart", CartSchema);
