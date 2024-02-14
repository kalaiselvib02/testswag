/* eslint-disable @typescript-eslint/no-explicit-any */
// TO-DO :Order Import Statements followed by Require statements

import { type Request, type Response } from "express";
import { OrdersListDTO } from "../dto/ordersList.dto";
import { sendEmail } from "../helpers/email.helper";
import {
	type OrderHistoryArray,
	type UserOrderResponse,
	type UserOrders,
	type ErrorOrderObject,
	type CartItemsResponse,
	CartItems,
	type OrdersResponseObject,
	UserOrderDetails,
} from "../types/order.type";
import { type UserInfo } from "../types/user.type";
import { logger } from "../logger/logger";
import { type User } from "../schemas/user.schema";
import { type Model } from "mongoose";
import { type Reward } from "../types/rewards.type";
import { type Transaction } from "../schemas/transaction.schema";
import {
	checkPaginationAndRespond,
	checkPaginationParams,
	getDateSortingFactor,
	pagination,
} from "../helpers/pagination.helper";
import {
	statusCodes,
	statusMessages,
	productVariations,
	dbOrderStatus,
	errorMessages,
	APP_CONSTANTS,
	MONGO_CONSTANTS,
	RESPONSE_CONSTANTS,
	cancelOrderErrorMessages,
	ORDER_HISTORY_STATUS,
	getDollarSigned,
	customisationParams,
	cartMessages,
	userPointsExpiredMessages,
} from "../constants";
import { orderMail } from "../constants/message.constants";
import moment from "moment";
import { Product } from "../models/products.model";
import { Cart } from "../schemas/cart.schema";
import { type COItem, type userDetails } from "../types/COItem.type";
import { createTransaction } from "../helpers/db.helpers";
import { cryptTheCoupon } from "../helpers/coupon.helpers";
const { sendResponse } = require("../helpers/json.helper.ts");
const {
	getPointsById,
	getProductColors,
	getProductSizes,
	getUserByEmpId,
	getAllProductsFromDB,
	updateOrderStatus,
} = require("../helpers/db.helpers");
const {
	getFieldFromArrayOfObjects,
	generateErrorResponseObj,
} = require("../helpers/common.helpers");
const TransactionSchema = require("../schemas/transaction.schema");
const ProductSchema = require("../schemas/product.schema");
const OrderSchema = require("../schemas/order.schema");
const OrderHistorySchema = require("../schemas/orderHistory.schema");
const OrderStatusSchema = require("../schemas/orderStatus.schema");
const ProductSize = require("../schemas/product.size.schema");
const ProductColor = require("../schemas/product.color.schema");
const CartSchema = require("../schemas/cart.schema");
const CouponSchema = require("../schemas/coupon.schema");
const RewardSchema = require("../schemas/reward.schema");
const RewardModel: Model<Reward> = require("../schemas/reward.schema");
const TransactionModel: Model<Transaction> = require("../schemas/transaction.schema");
const UserSchema = require("../schemas/user.schema");
const PointSchema = require("../schemas/point.schema");
import { SEQUENCE_NAMES } from "../constants/schema.constants";
import { Point } from "../types/point.type";
import { getNextSequence } from "../helpers/db.helpers";
import { TransactionObj } from "../types/transaction.type";

/**
 * purpose : to create custom error object for response
 * @param item
 * @param productObj
 * @param message
 * @param data
 * @returns
 */
const createErrorObject = (
	item: any,
	productObj: Product,
	message: string,
	errors: any,
) => {
	const errorObject: ErrorOrderObject = {
		productId: item.productId,
		productName: productObj?.title,
		message,
		errors,
	};
	return errorObject;
};

/**
 * purpose : to check if object in list has given value
 * @param list
 * @param prop
 * @param value
 * @returns
 */
const checkForObjectValue = (list: any, prop: string, value: any) => {
	return list.find(
		(obj: any) => obj[prop].toLowerCase() === value.toLowerCase() && value,
	);
};

const getCustomisationErrorMsg = (type: string) => {
	return RESPONSE_CONSTANTS.CART.BAD_DATA.INVALID_CUSTOMISATION.MESSAGE.replace(
		"$text",
		type,
	);
};
/**
 * purpose : to validate product customisation
 * @param item
 * @returns
 */
const validateProductCustomisations = async (item: any) => {
	const specifications = Object.keys(item);
	const erroObj = [];
	for (const type of specifications) {
		switch (type) {
			case customisationParams.SIZE:
				// TODO : db call
				const sizeList = await ProductSize.find();
				if (!checkForObjectValue(sizeList, type, item[type])) {
					erroObj.push({
						type: customisationParams.SIZE,
						value: item[type],
						message: getCustomisationErrorMsg(type),
					});
				}
				break;
			case customisationParams.COLOR:
				const colorList = await ProductColor.find();
				if (!checkForObjectValue(colorList, type, item[type])) {
					erroObj.push({
						type: customisationParams.COLOR,
						value: item[type],
						message: getCustomisationErrorMsg(type),
					});
				}
				break;
			default:
				break;
		}
	}
	return erroObj;
};
/**
 * purpose : it validates products
 * @param itemsList
 * @returns
 */
const validateProducts = async (itemsList: any) => {
	let productList = [];
	let isValidList = true;
	let errorsList: Array<ErrorOrderObject> = [] as Array<ErrorOrderObject>;
	for (let item of itemsList) {
		const productObj: Product = await ProductSchema.findOne({
			productId: item.productId,
		});
		if (productObj) {
			//check for customisation as well
			if (item?.customisation) {
				//valid product in order
				if (productObj.isCustomisable) {
					// check for customisable object
					const customisationErrorsList =
						await validateProductCustomisations(item.customisation);
					if (customisationErrorsList.length === 0) {
						productList.push({
							quantity: item.quantity,
							purchasedPoints: productObj.rewardPoints * item.quantity,
							productInfo: productObj,
							customisation: item.customisation,
						});
					} else {
						isValidList = false;
						errorsList.push(
							createErrorObject(
								item,
								productObj,
								statusMessages.CUSTOMISATION_ERROR,
								customisationErrorsList,
							),
						);
					}
				} else {
					isValidList = false;
					errorsList.push(
						createErrorObject(
							item,
							productObj,
							statusMessages.CUSTOMISATION_NOT_ALLOWED,
							item.customisation,
						),
					);
				}
			} else {
				productList.push({
					quantity: item.quantity,
					purchasedPoints: productObj.rewardPoints * item.quantity,
					productInfo: productObj,
				});
			}
		} else {
			// if not match - show all of them in error msg
			isValidList = false;
			errorsList.push(
				createErrorObject(item, productObj, statusMessages.NO_ITEM, item),
			);
		}
	}
	return {
		productList: productList,
		isValidList: isValidList,
		errorsList: {
			errors: errorsList,
		},
	};
};
/**
 * purpose : to place an order
 *  @param {Request} req
 *  @param {Response} res
 */
exports.placeOrder = async (req: Request, res: Response) => {
	logger.info("Entered User Service - Place Order");
	try {
		let emailContent: UserOrderResponse = {} as UserOrderResponse;
		let ordersObj: Array<UserOrders> = [];
		emailContent.orders = [];
		// Get EmployeeId from token
		const employeeInfo: UserInfo = res.locals.employeeinfo;
		const { employeeId, name, location } = employeeInfo;
		const userDetails = { employeeId, name, location };
		const order = new OrdersListDTO(req.body);
		let productValidationRes: any = [];
		const USER_POINTOBJ = await getPointsById(employeeId);
		//1. check user point object
		if (!USER_POINTOBJ) {
			const errorObj = {
				...generateErrorResponseObj(
					RESPONSE_CONSTANTS.ORDER.BAD_DATA.INSUFFICIENT_POINTS.MESSAGE,
				),
			};
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				errorObj,
				res,
			);
			return;
		} else {
			productValidationRes = await validateProducts(order.orderItems);
		}
		const { isValidList, productList, errorsList } = productValidationRes;
		// if order is not valid
		if (!isValidList) {
			const errorObject = {
				...generateErrorResponseObj(
					RESPONSE_CONSTANTS.ORDER.NOT_PLACED.MESSAGE,
				),
				errors: errorsList.errors,
			};
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				errorObject,
				res,
			);
			return;
		} else {
			// if valid order - do the process
			const totalPoints = productList.reduce(
				(totalPoints: number, obj: any) => totalPoints + obj.purchasedPoints,
				0,
			);
			if (totalPoints <= USER_POINTOBJ.available) {
				for (let product of productList) {
					const transaction = await TransactionSchema.create({
						employeeId: employeeId,
						isCredited: false,
						amount: product.purchasedPoints,
					});
					const orderStatusObj = await OrderStatusSchema.findOne({
						name: dbOrderStatus.SUBMITTED,
					});
					let orderHistoryInfo: OrderHistoryArray = <OrderHistoryArray>{};
					orderHistoryInfo = {
						status: orderStatusObj.name,
						userId: employeeId,
						userName: name,
						time: moment(new Date()).format("DD MMM YYYY"),
					};
					const orderHistoryObj = await OrderHistorySchema.create({
						status: orderStatusObj._id,
						history: orderHistoryInfo,
					});
					const order = await OrderSchema.create({
						employeeId: employeeId,
						transactionId: transaction._id,
						quantity: product.quantity,
						productId: product.productInfo.productId,
						statusId: orderHistoryObj._id,
						customisation: {
							size: product.customisation?.size,
							color: product.customisation?.color,
						},
					});
					//clear cart
					const cartStatus = await CartSchema.deleteMany({
						employeeId: employeeId,
					});
					ordersObj.push({
						orderId: order.orderId,
						productDetails: {
							productId: product.productInfo.productId,
							title: product.productInfo.title,
							productUrl: product.productInfo.productImgURL,
							rewardPoints: product.productInfo.rewardPoints,
							isCustomisable: product.productInfo.isCustomisable,
						},
						customisation: {
							size: product.customisation?.size,
							color: product.customisation?.color,
						},
						quantity: product.quantity,
						status: orderStatusObj.name,
						userDetails,
					});
				}
				emailContent = {
					employeeId: employeeId,
					employeeName: name,
					location: location,
					orders: ordersObj,
				};
				//3.send success response
				sendResponse(
					statusMessages.SUCCESS,
					RESPONSE_CONSTANTS.ORDER.PLACED.STATUS,
					ordersObj,
					res,
				);
				const updatedUserPointObj = await getPointsById(employeeId);
				emailContent.redeemedPoints = updatedUserPointObj.redeemed;
				emailContent.balance = updatedUserPointObj.available;
				const employeeObj: User = await getUserByEmpId(employeeId);
				if (employeeObj?.email) {
					await sendEmail({
						toAddress: employeeObj.email,
						...orderMail(emailContent),
					});
				} else {
					logger.error(
						"Employee email not available to send mail for the order placed by the employee:" +
							employeeId.toString(),
					);
				}
				return;
			} else {
				const errorObj = {
					...generateErrorResponseObj(
						RESPONSE_CONSTANTS.ORDER.BAD_DATA.INSUFFICIENT_POINTS
							.MESSAGE,
					),
				};
				sendResponse(
					statusMessages.BAD_REQUEST,
					statusCodes.BAD_REQUEST,
					errorObj,
					res,
				);
				return;
			}
		}
		logger.info("Exited User Service - Place Order - Successfully");
	} catch (error: any) {
		logger.error("Error in User Service - Place Order - ", error);
		const errorObj = {
			...generateErrorResponseObj(RESPONSE_CONSTANTS.ORDER.NOT_PLACED.MESSAGE),
		};
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			errorObj,
			res,
		);
	}
};

/**
 * @description Pushes the individual order data into userOrdersResponse Object
 * @param {UserOrderResponse} userOrdersResponse
 * @param  {any} order
 * @returns {UserOrderResponse}
 */
const setUserOrders = (
	ordersObj: OrdersResponseObject[],
	order: UserOrderDetails,
	userDetails: UserInfo,
): OrdersResponseObject[] => {
	ordersObj.push({
		orderId: order.orderId,
		quantity: order.quantity,
		customisation: order.customisation
			? { size: order.customisation?.size, color: order.customisation?.color }
			: {},
		status: order.orderHistory.history?.[order.orderHistory.history.length - 1]
			?.status,
		productDetails: {
			productId: order.productDetails?.productId,
			title: order.productDetails?.title,
			rewardPoints: order.productDetails?.rewardPoints,
			isCustomisable: order.productDetails?.isCustomisable,
			productImgURL: order.productDetails?.productImgURL,
		},
		orderHistory: order.orderHistory?.history,
		userDetails,
	});
	return ordersObj;
};

/**
 * @description Returns the Orders list for the given USER from mongoDB
 * @param {Request}  req
 * @param  {Response} res
 * @returns response message
 */
exports.getOrdersByEmployeeId = async (req: Request, res: Response) => {
	// pagination check
	const isPaginatedGenObject: Generator = checkPaginationAndRespond(req, res);
	const isValidPagination = isPaginatedGenObject.next().value;
	if (!isValidPagination) {
		isPaginatedGenObject.return(0);
		return;
	}
	// Get EmployeeId from token
	const employeeinfo: UserInfo = res.locals.employeeinfo;
	const employeeId = employeeinfo.employeeId;
	const name = employeeinfo.name;
	const role = employeeinfo.role;
	const location = employeeinfo.location;
	const userDetails = { employeeId, name, role, location };
	
	const transactionId = Number(req.query.transactionId);

	let userOrderList;
	if(transactionId !== undefined) {
		// Get the Orders list from DB
		userOrderList = await OrderSchema.aggregate([
			{ $match: { employeeId } },
			{
				$lookup: {
					from: MONGO_CONSTANTS.COLLECTIONS.TRANSACTIONS,
					localField: MONGO_CONSTANTS.REWARDS.TRANSACTION_ID,
					foreignField: MONGO_CONSTANTS.COMMONS._ID,
					as: MONGO_CONSTANTS.AS.TRANSACTION_DETAILS,
				},
			},
			{ $unwind: getDollarSigned(MONGO_CONSTANTS.AS.TRANSACTION_DETAILS) },
			{ $match: { $expr: { $eq:  [getDollarSigned(MONGO_CONSTANTS.AS.TRANSACTION_DETAILS_TRANSACTION_ID), transactionId] } } },
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
		]);
	} else {
		// Get the Orders list from DB
		 userOrderList = await OrderSchema.aggregate([
			{ $match: { employeeId } },
			{ $sort: { createdAt: 1 } },
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
		]);
	}
	
	

	// Check which orders belongs to the given user and push it into an Response Object
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	let ordersObj: OrdersResponseObject[] = [];
	for (const order of userOrderList) {
		try {
			ordersObj = setUserOrders(ordersObj, order, userDetails);
		} catch (error) {
			sendResponse(
				statusMessages.SERVER_ERROR,
				statusCodes.INTERNAL_SERVER_ERROR,
				{ ...generateErrorResponseObj(APP_CONSTANTS.OBJECT_FAILED) },
				res,
			);
			logger.warn("Fetch orders list for user - Failed");
			return;
		}
	}

	// setting the response
	isPaginatedGenObject.next(ordersObj);
	logger.info("Successfully fetched orders list for user");
};

/**
 *  This function retrieves user points
 *  @param {Request} req
 *  @param {Response} res
 */
exports.getUserPoints = async (req: Request, res: Response) => {
	try {
		// Get EmployeeId from token
		const employeeInfo: UserInfo = res.locals.employeeinfo;
		const employeeId = employeeInfo.employeeId;
		if (employeeId) {
			const points = await getPointsById(employeeId);
			const responseData = points
				? {
						total: points.total,
						redeemed: points.redeemed,
						available: points.available,
				  }
				: {
						total: 0,
						redeemed: 0,
						available: 0,
				  };
			sendResponse(statusMessages.SUCCESS, statusCodes.OK, responseData, res);
			logger.info("Successfully fetched points");
		}
	} catch (error) {
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
		logger.info("Fetch points Failed - Server Error");
	}
};

/**
 *  @description Returns the product list retrieved from mongoDB
 *  @param {Request} req
 *  @param {Response} res
 *  @returns response message
 */
exports.getAllProducts = async (req: Request, res: Response) => {
	try {
		const employeeInfo: UserInfo = res.locals.employeeinfo;
		const employeeId: number = employeeInfo.employeeId;
		const products = await getAllProductsFromDB(employeeId);

		if(products === 0) {
			logger.info("getAllProducts : No Products in DB");
			sendResponse(
				statusMessages.ERROR,
				statusCodes.NOT_FOUND,
				{ ...generateErrorResponseObj(APP_CONSTANTS.NO_DATA) },
				res
			);	
			return ;
		}

		sendResponse(statusMessages.SUCCESS, statusCodes.OK, products, res);
		logger.info("Successfully sent the response");
	} catch (error) {
		logger.error(error);
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(APP_CONSTANTS.NO_DATA) },
			res,
		);
	}
};

/**
 *  @description sets the response with user rewards
 *  @param {number} employeeId
 *  @param {Response} res
 *  @returns void | never
 */
exports.getAllUserRewards = async (
	employeeId: number,
	req: Request,
	res: Response,
) => {
	const isPaginatedGenObject: Generator = checkPaginationAndRespond(req, res);
	const isValidPagination = isPaginatedGenObject.next().value;
	if (!isValidPagination) {
		isPaginatedGenObject.return(0);
		return;
	}
	const user: User | null = await getUserByEmpId(employeeId);
	if (!user) {
		sendResponse(
			statusMessages.INVALID_USER,
			statusCodes.NOT_FOUND,
			{
				errorMessage: errorMessages.USER_NOT_FOUND,
			},
			res,
		);
		return;
	}
	const dateSortFactor = getDateSortingFactor(req);
	const savedRewards: Reward[] = await RewardModel.find({
		rewardee: user?._id, 
		transactionId: { $ne: null },
	})?.sort(dateSortFactor);
	const rewards = savedRewards.map(
		({ createdAtVal, description, rewardPoints }) => ({
			date: createdAtVal,
			description,
			rewardPoints,
		}),
	);
	logger.info("Successfully Fetched All Rewards of the user");
	isPaginatedGenObject.next(rewards);
};

/**
 *  @description sets the response with user transactions
 *  @param {number} employeeId
 *  @param {Response} res
 *  @returns void | never
 */
exports.getAllUserTransactions = async (
	employeeId: number,
	req: Request,
	res: Response,
) => {
	const isPaginatedGenObject: Generator = checkPaginationAndRespond(req, res);
	const isValidPagination = isPaginatedGenObject.next().value;
	if (!isValidPagination) {
		isPaginatedGenObject.return(0);
		return;
	}
	const dateSortFactor = getDateSortingFactor(req);
	const savedTransactions: any[] = await TransactionModel.find({
		employeeId,
	})?.sort(dateSortFactor);
	const transactions = savedTransactions.map(
		({
			date,
			description,
			transactionId,
			displayAmount,
			balance,
			displayTransactionId,
		}) => ({
			date,
			description,
			transactionId: displayTransactionId,
			amount: displayAmount,
			balance,
		}),
	);
	logger.info("Successfully Fetched All Transactions of the user");
	isPaginatedGenObject.next(transactions);
};

/**
 *  This function retrieves product colors
 *  @param {Request} req
 *  @param {Response} res
 */
exports.getProductColors = async (req: Request, res: Response) => {
	try {
		const colorObject = await getProductColors();
		const colors = await getFieldFromArrayOfObjects(
			colorObject,
			productVariations.COLOR,
		);
		sendResponse(statusMessages.SUCCESS, statusCodes.OK, colors, res);
		logger.info("Successfully fetched product colors");
	} catch (error) {
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
		logger.info("Fetch product color Failed - Server Error");
	}
};

/**
 *  This function retrieves product size
 *  @param {Request} req
 *  @param {Response} res
 */
exports.getProductSizes = async (req: Request, res: Response) => {
	try {
		const sizeObject = await getProductSizes();
		const size = await getFieldFromArrayOfObjects(
			sizeObject,
			productVariations.SIZE,
		);
		sendResponse(statusMessages.SUCCESS, statusCodes.OK, size, res);
		logger.info("Successfully fetched product size");
	} catch (error) {
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
		logger.info("Fetch product size Failed - Server Error");
	}
};

/**
 *  This function cancels user order
 *  @param {Request} req
 *  @param {Response} res
 */
exports.cancelUserOrder = async (req: Request, res: Response) => {
	try {
		const { orderId, changeTo } = req.body;
		// Check if change to status is cancelled.
		if (dbOrderStatus.CANCELLED === changeTo.toUpperCase()) {
			const userInfo: UserInfo = res.locals.employeeinfo;
			const userName: string = userInfo.name;
			const userId: number = userInfo.employeeId;
			const order = await OrderSchema.aggregate([
				{
					$match: { orderId },
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
						localField:
							MONGO_CONSTANTS.ORDER_STATUSES.ORDER_HISTORY_STATUS,
						foreignField: MONGO_CONSTANTS.COMMONS._ID,
						as: MONGO_CONSTANTS.AS.CURRENT_STATUS,
					},
				},
				{ $unwind: MONGO_CONSTANTS.UNWIND.CURRENT_STATUS },
			]);

			if (order[0]?.length !== 0) {
				// Update Call
				const isUpdateSuccess =
					order[0]?.currentStatus.name === dbOrderStatus.SUBMITTED
						? await updateOrderStatus({
								orderId: orderId,
								changeTo,
								updateUserId: userId,
								updateUserName: userName,
						  })
						: false;
				isUpdateSuccess
					? sendResponse(
							statusMessages.SUCCESS,
							statusCodes.OK,
							{ isSuccess: true, changedStatusTo: changeTo },
							res,
					  )
					: sendResponse(
							statusMessages.ERROR,
							statusCodes.BAD_REQUEST,
							{
								isSuccess: false,
								errorMessage: cancelOrderErrorMessages.CANCEL_ERROR,
							},
							res,
					  );
				logger.info(
					isUpdateSuccess
						? "Successfully cancelled order"
						: "Cannot Cancel Order",
				);
			} // Order not found for given product id and employee id.
			else {
				sendResponse(
					statusMessages.ERROR,
					statusCodes.NOT_FOUND,
					{
						isSuccess: false,
						errorMessage: cancelOrderErrorMessages.ORDER_NOT_FOUND,
					},
					res,
				);
				logger.info("Order not found");
			}
		} // Change to status is not Cancelled.
		else {
			sendResponse(
				statusMessages.ERROR,
				statusCodes.BAD_REQUEST,
				{
					isSuccess: false,
					errorMessage: cancelOrderErrorMessages.INVALID_STATUS,
				},
				res,
			);
			logger.info("Invalid status");
		}
	} catch (error) {
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
		logger.info("Cancel order failed - Server Error");
	}
};

/**
 * @description checks if two objects are deeply equal
 * @param obj1 - object
 * @param obj2 - object
 */
const areStringObjectsEqual = (obj1: object, obj2: object): boolean => {
	const object1: any = obj1 ?? {};
	const object2: any = obj2 ?? {};
	if (Object.keys(object1)?.length !== Object.keys(object2)?.length) {
		return false;
	}
	return Object.keys(object1).every(
		(key: string) => object1[key]?.toLowerCase() === object2[key]?.toLowerCase(),
	);
};

/**
 * purpose : to Update cart
 *  @param {Request} req
 *  @param {Response} res
 */
exports.updateCart = async (req: Request, res: Response) => {
	logger.info("Entering - User Service - Update Cart", res.locals);
	try {
		const { employeeId } = res.locals.employeeinfo;
		//check valid product & customisations are there for it
		const cartItems = new OrdersListDTO(req.body);
		const { productList, isValidList, errorsList } = await validateProducts(
			cartItems.orderItems,
		);
		if (!isValidList) {
			const errorObject = {
				...generateErrorResponseObj(
					RESPONSE_CONSTANTS.CART.NOT_PLACED.MESSAGE,
				),
				errors: errorsList.errors,
			};
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				errorObject,
				res,
			);
			return;
		} else {
			for (const product of productList) {
				// check valid product & customisations are there for it
				// check both with customisation & without :: CART
				// 1. identify if quantity is zero delete
				// 2. identify if quantity is not zero, update quantity
				// 3. if not found insert
				// save in cart
				const cartProducts: Cart[] = await CartSchema.find({
					employeeId,
					productId: product.productInfo.productId,
				});
				const cartProduct: any = cartProducts?.find(
					(currCartProduct: Cart) =>
						areStringObjectsEqual(
							currCartProduct.customisation,
							product.customisation,
						),
				);
				if (cartProduct && product.quantity === 0) {
					await CartSchema.findByIdAndDelete(cartProduct._id);
				} else if (cartProduct && product.quantity > 0) {
					await cartProduct.updateOne({ quantity: product.quantity });
				} else if (product.quantity > 0) {
					await CartSchema.create({
						employeeId,
						productId: product.productInfo.productId,
						quantity: product.quantity,
						customisation: product.customisation,
					});
				}
			}
			const data = {
				isSuccess: true,
			};
			sendResponse(statusMessages.SUCCESS, statusCodes.CREATED, data, res);
		}
		logger.info("Exiting - User Service - Update Cart - Successfully");
	} catch (error) {
		logger.error("Error in User Service - Update Cart ", error);
		const errorObject = {
			...generateErrorResponseObj(RESPONSE_CONSTANTS.CART.NOT_PLACED.MESSAGE),
		};
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			errorObject,
			res,
		);
	}
};

exports.getCart = async (req: Request, res: Response) => {
	logger.info("Entering - User Service - Get Cart");
	try {
		const { employeeId } = res.locals.employeeinfo;
		const cartItems = await CartSchema.aggregate([
			{ $match: { employeeId } },
			{
				$lookup: {
					from: MONGO_CONSTANTS.COLLECTIONS.PRODUCTS,
					localField: MONGO_CONSTANTS.PRODUCTS.PRODUCT_ID,
					foreignField: MONGO_CONSTANTS.PRODUCTS.PRODUCT_ID,
					as: MONGO_CONSTANTS.AS.PRODUCT_DETAILS,
				},
			},
			{ $unwind: "$productDetails" },
			{
				$replaceRoot: {
					newRoot: {
						$mergeObjects: [
							{
								productId: "$productDetails.productId",
								name: "$productDetails.title",
								productImage: "$productDetails.productImgURL",
								rewardPoints: "$productDetails.rewardPoints",
							},
							{
								quantity: "$$ROOT.quantity",
								customisation: "$$ROOT.customisation",
							},
						],
					},
				},
			},
			{
				$project: {
					_id: 0,
					employeeId: 0,
					__v: 0,
					isCustomisable: 0,
					createdAt: 0,
					productDetails: 0,
				},
			},
		]);

		// Send Response if no data found in DB
		if (cartItems === null) {
			sendResponse(
				statusMessages.SERVER_ERROR,
				statusCodes.NOT_FOUND,
				{ ...generateErrorResponseObj(APP_CONSTANTS.NO_DATA) },
				res,
			);
			return;
		}
		// Check which orders belongs to the given user and push it into an Response Object
		const cartItemsResponse: CartItemsResponse = {} as CartItemsResponse;
		cartItemsResponse.cartItems = cartItems;
		sendResponse(
			statusMessages.SUCCESS,
			statusCodes.OK,
			cartItemsResponse.cartItems,
			res,
		);
		logger.info("Exiting - User Service - Get Cart");
	} catch (error) {
		logger.error("Error in User Service - Get Cart", error);
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(null) },
			res,
		);
	}
};

/**
 *  This function deletes cart item
 *  @param {Request} req
 *  @param {Response} res
 */
exports.removeCartItem = async (req: Request, res: Response) => {
	try {
		const { productId, customisation } = req.body;
		const employeeInfo: UserInfo = res.locals.employeeinfo;
		const employeeId: number = employeeInfo.employeeId;

		// Find cart items by employee and product Id
		const cartProducts: Cart[] = await CartSchema.find({
			employeeId,
			productId,
		});

		// Filter cart by customisation
		const cartProduct: any = cartProducts?.find((currCartProduct: Cart) =>
			areStringObjectsEqual(currCartProduct.customisation, customisation),
		);
		// If cart product is present with the requested customisation then delete the item. Else send cart item not found.
		if (cartProduct) {
			const dbResult = await CartSchema.findByIdAndDelete(cartProduct._id);

			logger.info("Successfully deleted cart item");
			sendResponse(
				statusMessages.SUCCESS,
				statusCodes.OK,
				{ isSuccess: true, message: cartMessages.ITEM_REMOVED },
				res,
			);
		} else {
			logger.info("Cannot find cart item");
			sendResponse(
				statusMessages.ERROR,
				statusCodes.BAD_REQUEST,
				{ isSuccess: false, message: cartMessages.ITEM_NOT_FOUND },
				res,
			);
		}
	} catch (error) {
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
		logger.error("Remove cart item - Server Error");
	}
};

const getCOItemsStructured = (COItems: any[]): COItem[] => {
	logger.info("Entering getCOItemsStructured");
	let structuredCOItems: COItem[] = [];
	structuredCOItems = COItems?.map((COItem: any) => {
		const { productId, title, rewardPoints, isCustomisable, productImgURL } =
			COItem.productDetails;
		return {
			quantity: COItem.quantity,
			customisation: COItem.customisation ?? {},
			productDetails: {
				productId,
				title,
				rewardPoints,
				isCustomisable,
				productImgURL,
			},
		};
	});
	logger.info("Exiting getCOItemsStructured");
	return structuredCOItems;
};

exports.getCOItems = async (req: Request, res: Response) => {
	logger.info("Entering - User Service - Get CO Items");
	const { employeeId, name, location } = res?.locals?.employeeinfo;
	const COItems = await CartSchema.aggregate([
		{ $match: { employeeId } },
		{
			$lookup: {
				from: MONGO_CONSTANTS.COLLECTIONS.PRODUCTS,
				localField: MONGO_CONSTANTS.PRODUCTS.PRODUCT_ID,
				foreignField: MONGO_CONSTANTS.PRODUCTS.PRODUCT_ID,
				as: MONGO_CONSTANTS.AS.PRODUCT_DETAILS,
			},
		},
		{ $unwind: getDollarSigned(MONGO_CONSTANTS.AS.PRODUCT_DETAILS) },
	]);

	sendResponse(
		statusMessages.SUCCESS,
		statusCodes.OK,
		getCOItemsStructured(COItems),
		res,
	);
	logger.info("Exiting - User Service - Get CO Items");
};

export const claimUserReward = async (req: Request, res: Response) => {
	logger.info("Entering - User Service - Claim User Reward");
	const couponCode = req.body.couponCode;
	const secretCode = req.body.secretCode;
	const employeeinfo: UserInfo = res.locals.employeeinfo;
	const employeeId: number = employeeinfo.employeeId;
	try {
		const dbSecretCode = cryptTheCoupon(secretCode , couponCode);
		if (!dbSecretCode) {
			sendResponse(
				statusMessages.SUCCESS,
				statusCodes.NOT_FOUND,
				{"isSuccess" : false},
				res,
			);
			return;
		}
		const foundReward = await RewardModel.findOne({
			encryptedCouponCode: dbSecretCode
		})
		if(foundReward && !foundReward.isCouponExpired) {
			if(dbSecretCode === foundReward.encryptedCouponCode) {
				let description : any = foundReward?.description;
				let points : any = foundReward?.rewardPoints;
				const transactionId = await createTransaction(employeeId ,  description , true , points)
				const user = await getUserByEmpId(employeeId);
				
				await RewardModel.updateOne({encryptedCouponCode: dbSecretCode},{
					$set: { isCouponExpired: true, rewardee : user._id , transactionId : transactionId}
				});
				sendResponse(
						statusMessages.SUCCESS,
						statusCodes.OK,
						{"isSuccess" : true},
						res,
				);
				}
			else {
				sendResponse(
					statusMessages.SUCCESS,
					statusCodes.OK,
					{"isSuccess" : false},
					res,
				);
			}
		}
		else {
			sendResponse(
				statusMessages.SUCCESS,
				statusCodes.OK,
				{"isSuccess" : false},
				res,
			);
		}
	logger.info("Exiting - User Service - Claim User Points");
	} catch (error) {
	}
}
		
/**
 * Expires User Points : User balance gets updated to 0 and creates transaction
 */
export const expireUserPoints = async () => {
	try {
		const userList: Array<User> = await UserSchema.find({});
		let transactionList: Array<TransactionObj> = [];
		for(const user of userList) {
			let pointObject: Point | null = await getPointsById(user.employeeId);

			// If User Points Document does not exist or User Balance is 0, then go to next iteration
			if(pointObject === null || pointObject.available === 0 ) {
				continue ;
			}
			
			// Update User Points Document
			await PointSchema.updateOne(
				{ employeeId: user.employeeId },
				{ $inc: { available: -pointObject.available } }
			);
			
			// Create new TransactionId
			const newTransactionId: number = await getNextSequence(SEQUENCE_NAMES.TRANSACTION);

			// Insert the Transaction so that pre hook is not called
			const newTransaction = {
				employeeId: user.employeeId,
				description: userPointsExpiredMessages.POINTS_EXPIRED,
				isCredited: false,
				amount: pointObject.available,
				balance: 0,
				transactionId: newTransactionId
			};
			transactionList.push(newTransaction);
		}
		await TransactionSchema.insertMany(transactionList);
		logger.info("expireUserPoints : User Points are Expired");
	} catch (error: any) {
		logger.error("expireUserPoints :"+error);
		throw new Error(error);
	}
};

/**
 * Deletes all coupons in the DB
 */
export const expireAllCoupons = async () => {
	try {
		await RewardSchema.updateMany(
			{ isCouponExpired: false},
			{ $set: { isCouponExpired: true, encryptedCouponCode: null } },
		);

		logger.info("expireAllCoupons : All Coupons are removed from the DB");
	} catch (error: any) {
		logger.error("expireAllCoupons :"+error);
		throw new Error(error);
	}
}