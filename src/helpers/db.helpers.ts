import { type User } from "../types/user.type";
import { type Role } from "../types/role.type";
import { type Point } from "../schemas/point.schema";
import { type Counter } from "../schemas/counter.schema";
import { type Model } from "mongoose";
import { type Status } from "../types/status.type";
import { logger } from "../logger/logger";
import { dbOrderStatus } from "../constants";
import { sendEmail } from "./email.helper";
import {
	APP_CONSTANTS,
	MONGO_CONSTANTS,
	getDollarSigned,
	ORDER_HISTORY_STATUS,
} from "../constants/constants";
import { type UpdateOrderObject } from "../types/order.type";
import { type Location } from "../types/location.type";
import { type ProductColor } from "../types/product.color.type";
import { type ProductSize } from "../types/product.size.type";
import moment from "moment";
import { type OrderDTO } from "../dto/order.dto";
import { type OrderType } from "../types/order.type";
import { ProductResponseObject } from "../types/product.type";
const CounterModel: Model<Counter> = require("../schemas/counter.schema");
const UserModel = require("../schemas/user.schema");
const RoleSchema = require("../schemas/role.schema");
const PointSchema = require("../schemas/point.schema");
const ProductSchema = require("../schemas/product.schema");
const LocationSchema = require("../schemas/location.schema");
const OrderHistory = require("../schemas/orderHistory.schema");
const OrderStatus = require("../schemas/orderStatus.schema");
const Order = require("../schemas/order.schema");
const Transaction = require("../schemas/transaction.schema");
const ProductColorSchema = require("../schemas/product.color.schema");
const ProductSizeSchema = require("../schemas/product.size.schema");
const { statusUpdateMail } = require("../constants/message.constants");
const OrderSchema = require("../schemas/order.schema");
const CartSchema = require("../schemas/cart.schema");

/**
 * Get user by employee id
 * @param {number} empId
 * @returns {object}
 */
export const getUserByEmpId = async (empId: number): Promise<User> => {
	const user = await UserModel.findOne({ employeeId: empId });
	return user;
};

/**
 * Get user by user id
 * @param {string} id
 * @returns {Object}
 */
export const getUserById = async (id: string): Promise<User> => {
	const user = await UserModel.findById(id).exec();
	return user;
};

/**
 * Get user role id
 * @param {number} role
 * @returns {string}
 */
export const getUserRoleId = async (role: number): Promise<Role> => {
	const roleObject = await RoleSchema.findOne({ role });
	return roleObject._id;
};

/**
 * Get user role by id
 * @param {string} id
 * @returns {number}
 */
export const getUserRole = async (id: string): Promise<Role> => {
	const roleObject = await RoleSchema.findById(id);
	return roleObject.role;
};

/**
 * Get user points by employee id
 * @param {number} employeeId
 * @returns {object}
 */
export const getPointsById = async (employeeId: number): Promise<Point> => {
	const pointObject = await PointSchema.findOne({ employeeId });
	return pointObject;
};

/**
 * Get the incremented id
 * @param {string} id
 * @returns {number}
 */
export const getNextSequence = async (id: string): Promise<number> => {
	const counter = await CounterModel.findByIdAndUpdate(
		{ _id: id },
		{ $inc: { seq: 1 } },
		{ new: true, upsert: true },
	);
	return counter.seq;
};

/**
 * Get the product id by name
 * @param name
 * @returns
 */
export const getProductByName = async (name: string): Promise<number> => {
	const productId = await ProductSchema.findOne({ title: name });
	return productId.productId;
};

/**
 * Get number of orders with a particular status
 * @param {string} statusId
 * @returns {number}
 */
export const getOrderStatusCount = async (statusId: Status): Promise<number> => {
	const orderCount = await OrderHistory.countDocuments({ status: statusId });
	return orderCount;
};

/**
 * Validates whether or not a Status Change is valid
 * @param {number} currentStatusNumber
 * @param {number} statusNumber
 * @returns {boolean}
 */
const validateStatus = (currentStatusNumber: number, statusNumber: number) => {
	let isValid = false;

	switch (currentStatusNumber) {
		// If currentStatus is SUBMITTED, then it can only go to
		// CANCELLED or ACCEPTED or REJECTED
		case 1:
			statusNumber === 2 || statusNumber === 3 || statusNumber === 5
				? (isValid = true)
				: (isValid = false);
			break;

		// If currentStatus is CANCELLED, then it cannot be changeds
		case 2:
			isValid = false;
			break;

		// If currentStatus is ACCEPTED, then it can only go to
		// READY FOR PICKUP or REJECTED
		case 3:
			statusNumber === 4 || statusNumber === 5
				? (isValid = true)
				: (isValid = false);
			break;

		// If currentStatus is READY FOR PICKUP, then it can only go to
		// REJECTED or DELIVERED
		case 4:
			statusNumber === 5 || statusNumber === 6
				? (isValid = true)
				: (isValid = false);
			break;

		// If currentStatus is REJECTED, then it cannot be changed
		case 5:
			isValid = false;
			break;

		// If currentStatus is DELIVERED, then it cannot be changed
		case 6:
			isValid = false;
			break;
	}

	return isValid;
};

/**
 * Updates the status of Order
 * @param {number} orderId
 * @param {string} changeTo
 * @returns {}
 */
export const updateOrderStatus = async (
	updateOrderObj: UpdateOrderObject,
): Promise<number> => {
	logger.info("Update Order Status Helper - Entered");

	try {
		const { orderId, changeTo, updateUserName, updateUserId, rejectReason } = updateOrderObj;
		// Fetchs the status ID from OrderStatus Schema
		const orderStatus = await OrderStatus.findOne({
			name: changeTo.toUpperCase(),
		});
		const statusReferenceId = orderStatus._id;
		const statusNumber = orderStatus.status;

		// Get Order & Related Product Details
		const order = await Order.aggregate([
			{ $match: { orderId } },
			{
				$lookup: {
					from: MONGO_CONSTANTS.COLLECTIONS.PRODUCTS,
					localField: MONGO_CONSTANTS.PRODUCTS.PRODUCT_ID,
					foreignField: MONGO_CONSTANTS.PRODUCTS.PRODUCT_ID,
					as: MONGO_CONSTANTS.AS.PRODUCT_DETAILS,
				},
			},
			{
				$lookup: {
					from: MONGO_CONSTANTS.COLLECTIONS.USERS,
					localField: MONGO_CONSTANTS.USERS.EMPLOYEE_ID,
					foreignField: MONGO_CONSTANTS.USERS.EMPLOYEE_ID,
					as: MONGO_CONSTANTS.AS.USER_DETAILS,
				},
			},
			{
				$lookup: {
					from: MONGO_CONSTANTS.COLLECTIONS.ORDER_HISTORIES,
					localField: MONGO_CONSTANTS.ORDERS.STATUS_ID,
					foreignField: MONGO_CONSTANTS.COMMONS._ID,
					as: MONGO_CONSTANTS.AS.ORDER_HISTORY,
				},
			},
			{
				$lookup: {
					from: MONGO_CONSTANTS.COLLECTIONS.ORDER_STATUSES,
					localField: MONGO_CONSTANTS.ORDER_STATUSES.ORDER_HISTORY_STATUS,
					foreignField: MONGO_CONSTANTS.COMMONS._ID,
					as: MONGO_CONSTANTS.AS.CURRENT_STATUS,
				},
			},
		]);
		const userId = order[0].userDetails?.[0]?.employeeId;
		const userName = order[0].userDetails?.[0]?.name;
		const currentStatusNumber = order[0].currentStatus[0].status;

		// Checking if Updating the value is valid or not
		const isValid = validateStatus(currentStatusNumber, statusNumber);
		if (!isValid) {
			logger.info("Update Validation Failed");
			logger.info("Update Order Status Helper - Exited");
			return 0;
		}

		const historyId = order[0]?.statusId;
		const productName = order[0]?.productDetails[0]?.title;
		const userEmail = order[0]?.userDetails[0]?.email;
		const quantity = order[0]?.quantity;
		const rewardPoints = order[0]?.productDetails[0]?.rewardPoints;
		const productImgURL = order[0]?.productDetails[0]?.productImgURL;
		const amount: number = rewardPoints * order[0]?.quantity;
		const rewardeeId = order[0]?.employeeId;

		if (
			historyId === undefined ||
			productName === undefined ||
			userEmail === undefined ||
			amount === undefined
		) {
			logger.warn("Insufficient Data from MongoDB");
			logger.info("Update Order Status Helper - Exited");
			return 0;
		}

		// Performs the Update Call
		if(rejectReason === undefined) {
			await OrderHistory.updateOne(
				{ _id: historyId },
				{
					$set: { status: statusReferenceId },
					$push: {
						history: {
							userName: updateUserName,
							userId: updateUserId,
							status: changeTo.toUpperCase(),
							time: moment(new Date()).format("DD MMM YYYY"),
						},
					},
				},
			);
		} else {
			await OrderHistory.updateOne(
				{ _id: historyId },
				{
					$set: { status: statusReferenceId },
					$push: {
						history: {
							userName: updateUserName,
							userId: updateUserId,
							status: changeTo.toUpperCase(),
							reason: rejectReason,
							time: moment(new Date()).format("DD MMM YYYY"),
						},
					},
				},
			);
		}
		

		// Triggers a Transaction if Status is changed to 'REJECTED' or 'CANCELLED'
		if (
			changeTo.toUpperCase() === dbOrderStatus.REJECTED ||
			changeTo.toUpperCase() === dbOrderStatus.CANCELLED
		) {
			const description: string =
				APP_CONSTANTS.REFUND_ORDER_NO + orderId + " - " + productName;
			const transactionId = await createTransaction(
				rewardeeId,
				description,
				true,
				amount,
			);
			// undoing Transaction pre-save for this case
			const userPoints = await PointSchema.findOne({ employeeId: userId });
			userPoints.total = userPoints.total - amount;
			userPoints.redeemed = userPoints.redeemed - amount;
			userPoints.available = userPoints.total - userPoints.redeemed;
			await userPoints.save();
			logger.info("Transaction for Points Refund Created - " + transactionId);
		}
		const userPoints = await PointSchema.findOne({ employeeId: userId });
		// Triggering Email for status change
		sendEmail({
			// toAddress: process.env.TO_ADDRESS,
			toAddress: userEmail,
			...statusUpdateMail({
				userName,
				userBalance: userPoints.available,
				orderNo: orderId,
				orderUpdatedStatus: changeTo,
				productTitle: productName,
				quantity,
				rewardPoints,
				totalPoints: amount,
				productImgURL,
				rejectionReason: rejectReason,
			}),
		})
			.then(() => {
				logger.info("Email Sent");
			})
			.catch((error) => {
				logger.error("Email not Sent : ", error.message);
			});
	} catch (error) {
		logger.error("Mongo Update Failed");
		logger.info("Update Order Status Helper - Exited");
		return 0;
	}
	logger.info("Update Order Status Helper - Exited");
	return 1;
};

/**
 * @description Creates a transaction for a given record
 * @param
 * @returns TransactionId
 */
export const createTransaction = async (
	employeeId: number,
	description: string,
	isCredited: boolean,
	amount: number,
) => {
	const transaction = await Transaction.create({
		employeeId,
		description,
		isCredited,
		amount,
	});
	return transaction._id;
};

/**
 * Get user location id
 * @param {string} location
 * @returns {string}
 */
export const getUserLocationId = async (location: string): Promise<Location> => {
	const locationObject = await LocationSchema.findOne({
		name: location?.toUpperCase(),
	});
	return locationObject._id;
};
/**
 * Get status id
 * @param {string} status
 * @returns {string}
 */
export const getStatusId = async (status: string): Promise<Status> => {
	const statusObject = await OrderStatus.findOne({ name: status });
	return statusObject._id;
};

/**
 * Get product colors
 * @returns {object}
 */
export const getProductColors = async (): Promise<ProductColor> => {
	const productColors = await ProductColorSchema.find();
	return productColors;
};

/**
 * Get product sizes
 * @returns {object}
 */
export const getProductSizes = async (): Promise<ProductSize> => {
	const productSizes = await ProductSizeSchema.find();
	return productSizes;
};

/**
 * Get object by specifying field in param
 * @param {string} fieldName
 * @param {SchemaDefinition} schema
 * @param {string} fieldValue
 * @returns {obj}
 */
export const getObjByField = async (findObj: object, schema: any) => {
	const obj = await schema.findOne(findObj);
	return obj;
};
/**
 * Get object by specifying id
 * @param {SchemaDefinition} schema
 * @param {string} id
 * @returns {obj}
 */
export const getObjById = async (schema: any, id: string) => {
	const obj = await schema.findById(id).exec();
	return obj;
};

/**
 * Get orders by given match field
 * @param {object} matchField
 * @returns {object}
 */
export const getOrdersByMatch = async (
	employeeId: number,
	status: string[],
	location: string[],
): Promise<OrderDTO> => {
	try {
		const orders =
			(await OrderSchema.aggregate([
				{ $sort: { createdAt: 1 } },
				employeeId ? { $match: { employeeId } } : { $match: {} },
				{
					$lookup: {
						from: MONGO_CONSTANTS.COLLECTIONS.USERS,
						localField: MONGO_CONSTANTS.USERS.EMPLOYEE_ID,
						foreignField: MONGO_CONSTANTS.USERS.EMPLOYEE_ID,
						as: MONGO_CONSTANTS.AS.USER_DETAILS,
					},
				},
				{ $unwind: getDollarSigned(MONGO_CONSTANTS.AS.USER_DETAILS) },
				{
					$lookup: {
						from: MONGO_CONSTANTS.COLLECTIONS.LOCATION,
						localField: MONGO_CONSTANTS.AS.USER_DETAILS_LOCATION,
						foreignField: MONGO_CONSTANTS.COMMONS._ID,
						as: MONGO_CONSTANTS.AS.USER_LOCATION,
					},
				},
				{
					$unwind: getDollarSigned(MONGO_CONSTANTS.AS.USER_LOCATION),
				},
				location
					? {
							$match: {
								[MONGO_CONSTANTS.AS.USER_LOCATION_NAME]: {
									$in: location,
								},
							},
					  }
					: { $match: {} },
				{
					$lookup: {
						from: MONGO_CONSTANTS.COLLECTIONS.PRODUCTS,
						localField: MONGO_CONSTANTS.PRODUCTS.PRODUCT_ID,
						foreignField: MONGO_CONSTANTS.PRODUCTS.PRODUCT_ID,
						as: MONGO_CONSTANTS.AS.PRODUCT_DETAILS,
					},
				},
				{ $unwind: getDollarSigned(MONGO_CONSTANTS.AS.PRODUCT_DETAILS) },
				{
					$lookup: {
						from: MONGO_CONSTANTS.COLLECTIONS.ORDER_HISTORIES,
						localField: MONGO_CONSTANTS.ORDERS.STATUS_ID,
						foreignField: MONGO_CONSTANTS.COMMONS._ID,
						as: MONGO_CONSTANTS.AS.ORDER_HISTORY,
					},
				},
				{ $unwind: getDollarSigned(MONGO_CONSTANTS.AS.ORDER_HISTORY) },
				{
					$lookup: {
						from: MONGO_CONSTANTS.COLLECTIONS.ORDER_STATUSES,
						localField: ORDER_HISTORY_STATUS,
						foreignField: MONGO_CONSTANTS.COMMONS._ID,
						as: MONGO_CONSTANTS.AS.CURRENT_STATUS,
					},
				},
				{ $unwind: getDollarSigned(MONGO_CONSTANTS.AS.CURRENT_STATUS) },

				status
					? {
							$match: {
								[MONGO_CONSTANTS.AS.CURRENT_STATUS_NAME]: {
									$in: status,
								},
							},
					  }
					: { $match: {} },
			])) || null;
		return orders;
	} catch (error) {
		logger.error(error);
		throw error;
	}
};

/**
 * Get products list from DB
 * @param {}
 * @returns {ProductResponseObject | number}
 */
export const getAllProductsFromDB = async (
	employeeId: number,
): Promise<Array<ProductResponseObject> | number> => {
	try {
		const productsList = await ProductSchema.aggregate([
			{
				$lookup: {
					from: MONGO_CONSTANTS.COLLECTIONS.ORDERS,
					localField: MONGO_CONSTANTS.ORDERS.PRODUCT_ID,
					foreignField: MONGO_CONSTANTS.ORDERS.PRODUCT_ID,
					as: MONGO_CONSTANTS.AS.ORDER_DETAILS,
				},
			},
		]);
		
        if (productsList.length === 0 || productsList === null) {
            return 0;
        }

		const productsResponseObj: ProductResponseObject[] = [];
		for (const product of productsList) {
			const orderByEmployee = product.orderDetails.filter((obj: OrderType) => obj.employeeId === employeeId);

			const productToPush: ProductResponseObject = {
				productId: product.productId,
				title: product.title,
				rewardPoints: product.rewardPoints,
				isCustomisable: product.isCustomisable,
				productImgURL: product.productImgURL,
			};
			if (employeeId) {
				productToPush.isAlreadyPurchased = false;
				for (const order of orderByEmployee) {
					if (await getDeliveredOrder(order.orderId)) {
						productToPush.isAlreadyPurchased = true;
					}
				}
			}
			productsResponseObj.push(productToPush);
		}

		// Return the retrived products
		logger.info("Successfully fetched products list");
		return productsResponseObj;
	} catch (error) {
		logger.error(error);
	}

	return 0;
};
/**
 * Get orders by employee id, product id
 * @param {object} matchField
 * @returns {object}
 */
export const getOrdersByEmpIdAndProductId = async (
	employeeId: number,
	productId: number,
) => {
	const order = await Order.aggregate([
		{
			$match: {
				$and: [{ employeeId }, { productId }],
			},
		},
		{
			$lookup: {
				from: MONGO_CONSTANTS.COLLECTIONS.ORDER_HISTORIES,
				localField: MONGO_CONSTANTS.ORDERS.STATUS_ID,
				foreignField: MONGO_CONSTANTS.COMMONS._ID,
				as: MONGO_CONSTANTS.AS.ORDER_HISTORY,
			},
		},
		{ $unwind: MONGO_CONSTANTS.UNWIND.ORDER_HISTORY },
		{
			$lookup: {
				from: MONGO_CONSTANTS.COLLECTIONS.ORDER_STATUSES,
				localField: MONGO_CONSTANTS.ORDER_STATUSES.ORDER_HISTORY_STATUS,
				foreignField: MONGO_CONSTANTS.COMMONS._ID,
				as: MONGO_CONSTANTS.AS.CURRENT_STATUS,
			},
		},
		{ $unwind: MONGO_CONSTANTS.UNWIND.CURRENT_STATUS },
	]);
	return order;
};

export const getDeliveredOrder = async (
	orderId: number,
) => {
	
	const order = await Order.aggregate([
		{
			$match: {
				[MONGO_CONSTANTS.ORDERS.ORDER_ID]: {
					$eq: orderId,
				},
			},
		},
		{
			$lookup: {
				from: MONGO_CONSTANTS.COLLECTIONS.ORDER_HISTORIES,
				localField: MONGO_CONSTANTS.ORDERS.STATUS_ID,
				foreignField: MONGO_CONSTANTS.COMMONS._ID,
				as: MONGO_CONSTANTS.AS.ORDER_HISTORY,
			},
		},
		{ $unwind: MONGO_CONSTANTS.UNWIND.ORDER_HISTORY },
		{
			$lookup: {
				from: MONGO_CONSTANTS.COLLECTIONS.ORDER_STATUSES,
				localField: MONGO_CONSTANTS.ORDER_STATUSES.ORDER_HISTORY_STATUS,
				foreignField: MONGO_CONSTANTS.COMMONS._ID,
				as: MONGO_CONSTANTS.AS.CURRENT_STATUS,
			},
		},
		{ $unwind: MONGO_CONSTANTS.UNWIND.CURRENT_STATUS },
		{
			$match: {
				[MONGO_CONSTANTS.AS.CURRENT_STATUS_NAME]: {
					$eq: dbOrderStatus.DELIVERED,
				},
			},
		},
	]);	
	return order.length !== 0 ? order : null;
};