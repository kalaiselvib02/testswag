import fs from "fs";
import { Product } from "../models/products.model";
import express, { Request, Response } from "express";
import { getJSONFromSheet } from "../helpers/xl.helper";
import {
	statusCodes,
	statusMessages,
	MONGO_CONSTANTS,
	dbOrderStatus,
} from "../constants";
import {
	APP_CONSTANTS,
	ORDER_HISTORY_STATUS,
	getDollarSigned,
} from "../constants/constants";
import { logger } from "../logger/logger";
import { UserInfo } from "../types/user.type";
import { OrderStatusChangeResponse } from "../types/response.type";
import { OrdersResponseObject, OrdersType } from "../types/order.type";
import { ProductResponseObject } from "../types/product.type";
import { error } from "console";
const ProductSchema = require("../schemas/product.schema");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { sendResponse, sendServerErrorResponse } = require("../helpers/json.helper");
const {
	getAllOrderStatusCount,
	toUpperCaseArrayOfString,
	getIdsFromArray,
	generateErrorResponseObj,
	generateProductUploadResponseObj,
} = require("../helpers/common.helpers");
const { checkPaginationAndRespond } = require("../helpers/pagination.helper");
const {
	updateOrderStatus,
	getOrdersByMatch,
	getUserByEmpId,
	getAllProductsFromDB,
	getObjById,
} = require("../helpers/db.helpers");
const { validateOrderFilters } = require("../helpers/validation.helpers");
const OrderStatusSchema = require("../schemas/orderStatus.schema");
const LocationSchema = require("../schemas/location.schema");
const OrderSchema = require("../schemas/order.schema");
import { type Counter } from "../schemas/counter.schema";
import { Model } from "mongoose";
const CounterModel: Model<Counter> = require("../schemas/counter.schema");

/**
 * @description Returns the product list retrived from mongoDB
 * @param req
 * @param res
 * @returns response message
 */
exports.getAllProducts = async (req: Request, res: Response) => {
	try {
		const products = await getAllProductsFromDB();

		// pagination check
		const isPaginatedGenObject: Generator = checkPaginationAndRespond(req, res);
		const isValidPagination = isPaginatedGenObject.next().value;
		if (!isValidPagination) {
			isPaginatedGenObject.return(0);
			return;
		}

		if (products === 0) {
			sendResponse(
				statusMessages.SERVER_ERROR,
				statusCodes.NOT_FOUND,
				{ ...generateErrorResponseObj(APP_CONSTANTS.NO_DATA) },
				res,
			);
			return;
		}

		// setting the response
		isPaginatedGenObject.next(products);
		// sendResponse(statusMessages.SUCCESS, statusCodes.CREATED, products, res);
	} catch (error) {
		logger.error(error);
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj("Server Error") },
			res,
		);
	}
};

/**
 * @description Writes products into mongoDB
 * @param Array<Product>
 */
const addProducts = async (newProducts: Array<Product>) => {
	let duplicateProducts: Array<string> = [];
	try {
		await ProductSchema.insertMany(newProducts, { ordered: false });
	} catch (error: any) {
		logger.error("addProducts - ", error);
		const errorObjects = error.results;
		for (const errorObj of errorObjects) {
			if (errorObj.err?.code === 11000) {
				duplicateProducts.push(errorObj.err.op.title);
			}
		}
		return duplicateProducts;
	}
	return [];
};

/**
 * @description Validates the Products from Excel and adds validated products into DB and returns responseObject
 * @param {Array<Product>} products
 * @returns { ProductResponseObject, number } responseProductList, failedProducts
 */
const validateProductsAndInsertIntoDB = async (products: Array<Product>) => {
	let validatedProducts: Array<Product> = [];
	let responseProductList: Array<ProductResponseObject> = [];
	let failedProducts = 0;

	products?.forEach((newProduct: Product) => {
		if (
			typeof newProduct.rewardPoints !== "number" ||
			typeof newProduct.title !== "string" ||
			typeof newProduct.isCustomisable !== "string" ||
			typeof newProduct.productImgURL !== "string" ||
			!(
				newProduct.isCustomisable.toString().toUpperCase() === "YES" ||
				newProduct.isCustomisable.toString().toUpperCase() === "NO"
			)
		) {
			responseProductList.push(
				generateProductUploadResponseObj(newProduct, true),
			);
			failedProducts++;
		} else {
			responseProductList.push(
				generateProductUploadResponseObj(newProduct, false),
			);
			validatedProducts.push({
				title: newProduct.title.replace(/\s+/g, ' ').trim(),
				rewardPoints: newProduct.rewardPoints,
				isCustomisable: newProduct.isCustomisable.toString().toUpperCase() === "YES",
				productImgURL: newProduct.productImgURL,
				createdAt: newProduct.createdAt,
			});
		}
	});

	// Adding only the validated products
	const duplicateProducts = await addProducts(validatedProducts);

	// Decrementing Counters for 'products' to remove duplicate product counts
	if(duplicateProducts.length) {
		await CounterModel.updateOne({_id: "products"},{$inc: {"seq": -(duplicateProducts.length)}});
	}
	
	responseProductList.forEach((product) => {
		if (duplicateProducts.includes(product.title)) {
			if(product.isErroneous !== true) {
				failedProducts++; 
			}
			product.isErroneous = true;
		}
	});
	return { responseProductList, failedProducts };
};

/**
 * @description Retrieves the product data from request body and inserts it into DB
 * @param req
 * @param res
 * @returns response message
 */
exports.createProduct = async (req: Request, res: Response) => {
	try {
		const productDetails = req.body;

	// Validate Request Body Data
	if (productDetails === null || 
		typeof productDetails.title !== "string"  ||
		typeof productDetails.rewardPoints !== "number" ||
		typeof productDetails.isCustomisable !== "string" ||
		typeof productDetails.productImgURL !== "string" 
		) {
		logger.error("createProduct - Admin Service: Error in Request Body");
		sendResponse(
			statusMessages.ERROR,
			statusCodes.BAD_REQUEST,
			{ ...generateErrorResponseObj(APP_CONSTANTS.ERROR_IN_REQUEST_BODY) },
			res,
		);
		return;
	}

	const { responseProductList, failedProducts } =
		await validateProductsAndInsertIntoDB([productDetails]);

		sendResponse(statusMessages.SUCCESS, statusCodes.CREATED, responseProductList, res);
	} catch (error) {
		logger.error("createProduct - Admin Service:", error);
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
	}
};

/**
 * @description Retrieves the file from request body and converts it into JSON and validates the data to add to the mongoDB
 * @param req
 * @param res
 * @param productsFile: multer file(Excel)
 * @returns response message
 */
exports.createProducts = async (
	req: Request,
	res: Response,
	productsFile: Express.Multer.File,
) => {
	try {
		let products: Product[] | null = null;
		try {
			if (productsFile.path) {
				products = await getJSONFromSheet(productsFile);
			}
		} catch	(error) {
			logger.error("createProducts - Admin Service:", error);
			sendResponse(
				statusMessages.ERROR,
				statusCodes.BAD_REQUEST,
				{ ...generateErrorResponseObj(APP_CONSTANTS.NO_FILE_IN_REQUEST_BODY) },
				res,
			);
			return;
		}

		// If the File din't contain any data, then return reponse "empty"
		if (products?.length === 0 || products === null) {
			logger.info("Empty Product Excel File");
			sendResponse(
				statusMessages.ERROR,
				statusCodes.BAD_REQUEST,
				{ ...generateErrorResponseObj(APP_CONSTANTS.EMPTY_EXCEL_SHEET) },
				res,
			);
			return;
		}

		// Validate Products and Insert Validated Products into DB
		const { responseProductList, failedProducts } =
			await validateProductsAndInsertIntoDB(products);

		// response if fully successful
		if (failedProducts) {
			sendResponse(
				statusMessages.PARTIAL_SUCCESS,
				statusCodes.MULTI_STATUS,
				responseProductList,
				res,
			);
			return;
		}
		sendResponse(statusMessages.SUCCESS, statusCodes.CREATED, responseProductList, res);
	} catch (error: any) {
		logger.error("createProducts : "+error);
		sendServerErrorResponse();
	}
};

/**
 * @description Retrieves the number of orders for all order status
 * @param req
 * @param res
 * @returns response message
 */
exports.orderStatusCount = async (req: Request, res: Response) => {
	try {
		const orderStatusCount = await getAllOrderStatusCount();
		logger.info("Admin Dashboard : status of orders sent successfully");
		sendResponse(statusMessages.SUCCESS, statusCodes.OK, orderStatusCount, res);
	} catch (error) {
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
	}
};

/**
 * @description Changes the Order Status
 * @param req
 * @param res
 * @returns response message
 */
exports.changeOrderStatus = async (req: Request, res: Response) => {
	try {
		let isUpdateSuccess;
		const employeeinfo: UserInfo = res.locals.employeeinfo;
		const userName: string = employeeinfo.name;
		const userId: number = employeeinfo.employeeId;

		// Update Call if the Order is REJECTED
		if (req.body?.changeTo.toUpperCase() === dbOrderStatus.REJECTED) {
			// If Reject Reason exists, then send it to the helper
			isUpdateSuccess = await updateOrderStatus({
				updateUserName: userName,
				updateUserId: userId,
				orderId: req.body?.orderId,
				changeTo: req.body?.changeTo,
				rejectReason: req.body?.rejectReason,
			});
		} else {
			// If Reject Reson does not exist, then just send the necessary details
			isUpdateSuccess = await updateOrderStatus({
				updateUserName: userName,
				updateUserId: userId,
				orderId: req.body?.orderId,
				changeTo: req.body?.changeTo,
			});
		}

		// Set Response Object based on success or failure
		let responseObject: OrderStatusChangeResponse;
		if (isUpdateSuccess) {
			responseObject = {
				isSuccess: true,
				changedStatusTo: req.body?.changeTo,
			};
		} else {
			responseObject = { isSuccess: false };
		}

		// sendResponse(statusMessages.SUCCESS, statusCodes.OK, result, res);
		sendResponse(statusMessages.SUCCESS, statusCodes.OK, responseObject, res);
	} catch (error) {
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
	}
};

/**
 * @description Retrieves the filtered orders
 * @param req
 * @param res
 * @returns response message
 */
exports.filterOrders = async (req: Request, res: Response) => {
	try {
		const { employeeId, status, location } = req.body;
		let orders;
		let filteredArray: OrdersResponseObject[] = [];
		// pagination check
		const isPaginatedGenObject: Generator = checkPaginationAndRespond(req, res);
		const isValidPagination = isPaginatedGenObject.next().value;
		if (!isValidPagination) {
			isPaginatedGenObject.return(0);
			return;
		}
		const isValid = await validateOrderFilters(employeeId, status, location);
		if (isValid === true) {
			orders = await getOrdersByMatch(
				employeeId,
				status ? toUpperCaseArrayOfString(status) : null,
				location ? toUpperCaseArrayOfString(location) : null,
			);
			filteredArray = setOrdersResponseObject(orders);
			logger.info("Filtered orders sent successfully");
			isPaginatedGenObject.next(filteredArray);
		} else {
			logger.error("Invalid filter");
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				{ errorMap: isValid },
				res,
			);
		}
	} catch (error) {
		logger.error("Server error");
		sendResponse(
			statusMessages.BAD_REQUEST,
			statusCodes.INTERNAL_SERVER_ERROR,
			statusMessages.SERVER_ERROR,
			res,
		);
	}
};

/**
 * @description Sets the Orders Response Object and returns it
 * @param {OrderSchema} orderList
 * @returns {OrdersResponseObject[]}
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setOrdersResponseObject = (ordersList: any[]): OrdersResponseObject[] => {
	const orderResponseObj: OrdersResponseObject[] = [];

	for (const order of ordersList) {
		orderResponseObj.push({
			orderId: order.orderId,
			quantity: order.quantity,
			customisation: order.customisation
				? {
						size: order.customisation?.size,
						color: order.customisation?.color,
				  }
				: {},
			status: order.orderHistory.history?.[
				order.orderHistory.history.length - 1
			]?.status,
			productDetails: {
				productId: order.productDetails?.productId,
				title: order.productDetails?.title,
				rewardPoints: order.productDetails?.rewardPoints,
				isCustomisable: order.productDetails?.isCustomisable,
				productImgURL: order.productDetails?.productImgURL,
			},
			userDetails: {
				employeeId: order.userDetails?.employeeId,
				name: order.userDetails?.name,
				location: order.userLocation?.name,
			},
			orderHistory: order.orderHistory?.history,
		});
	}

	return orderResponseObj;
};

/**
 * @description Returns the orders list retrived from mongoDB
 * @param req
 * @param res
 * @returns response message
 */
exports.getAllOrders = async (req: Request, res: Response) => {
	// pagination check
	const isPaginatedGenObject: Generator = checkPaginationAndRespond(req, res);
	const isValidPagination = isPaginatedGenObject.next().value;
	if (!isValidPagination) {
		isPaginatedGenObject.return(0);
		return;
	}

	const ordersList =
		(await OrderSchema.aggregate([
			{ $sort: { createdAt: 1 } },
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
		])) || null;
	logger.info("Successfully fetched all orders");

	const ordersResponseObj: OrdersResponseObject[] =
		setOrdersResponseObject(ordersList);

	// setting the response
	isPaginatedGenObject.next(ordersResponseObj);
};
