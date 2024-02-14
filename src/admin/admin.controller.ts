import { Request, Response } from "express";
import {
	statusCodes,
	statusMessages,
	orderFilterErrorMessages,
	dbOrderStatus,
} from "../constants";
import { logger } from "../logger/logger";
import { OrderFilterDTO } from "../dto/orderFilter.dto";
import {
	RejectOrderStatusDTO,
	UpdateOrderStatusDTO,
} from "../dto/updateOrderStatus.dto";
import { validate } from "class-validator";

const { sendResponse, sendServerErrorResponse } = require("../helpers/json.helper");
const adminService = require("./admin.service");
const {
	classValidate,
	generateErrorResponseObj,
} = require("../helpers/common.helpers");

/**
 * @description Get All Products List
 * @param req
 * @param res
 * @returns Server Response Message
 */
exports.getProductsList = (req: Request, res: Response) => {
	try {
		adminService.getAllProducts(req, res);
	} catch (error) {
		logger.error("Server Error : ", error);
	}
};

/**
 * @description Retrieves the product data from request body and inserts it into DB
 * @param req
 * @param res
 * @returns Server Response Message
 */
exports.createProduct = async (req: Request, res: Response) => {
	try {
		adminService.createProduct(req, res);
	} catch (error) {
		logger.error(error);
	}
};

/**
 * @description Create Bulk products by uploading excel file
 * @param req
 * @param res
 * @returns Server Response Message
 */
exports.bulkCreateProducts = async (req: Request, res: Response) => {
	try {
		const productsFile = req.file;
		adminService.createProducts(req, res, productsFile);
	} catch (error) {
		logger.error(error);
	}
};

/**
 * @description Retrieves the number of orders for all order status
 * @param req
 * @param res
 * @returns Server Response Message
 */
exports.getOrderStatusCount = (req: Request, res: Response) => {
	adminService.orderStatusCount(req, res);
};

/**
 * @description Calls the Admin Service method to change Order status
 * @param req
 * @param res
 * @returns Server Response Message
 */
exports.changeOrderStatus = async (req: Request, res: Response) => {
	try {
		const { orderId, changeTo, rejectReason } = req.body;
		if (changeTo.toUpperCase() === dbOrderStatus.REJECTED) {
			if (!Object.keys(req.body).includes("rejectReason")) {
				const errorObj = {
					...generateErrorResponseObj("Reject Reason Required"),
				};
				sendResponse(
					statusMessages.BAD_REQUEST,
					statusCodes.BAD_REQUEST,
					errorObj,
					res,
				);
				return;
			}
			const errorMap = await classValidate(
				RejectOrderStatusDTO,
				orderId,
				changeTo,
				rejectReason,
			);
			if (Object.keys(errorMap).length) {
				logger.error(
					"Change Order Status Controller - Class validator error",
				);
				sendResponse(
					statusMessages.BAD_REQUEST,
					statusCodes.BAD_REQUEST,
					{ ...generateErrorResponseObj(errorMap.rejectReason) },
					res,
				);
				return;
			} else {
				adminService.changeOrderStatus(req, res);
			}
		} else {
			const errorMap = await classValidate(
				UpdateOrderStatusDTO,
				orderId,
				changeTo,
			);
			if (Object.keys(errorMap).length) {
				logger.error(
					"Change Order Status Controller - Class validator error",
				);
				sendResponse(
					statusMessages.BAD_REQUEST,
					statusCodes.BAD_REQUEST,
					{ ...generateErrorResponseObj(errorMap.rejectReason) },
					res,
				);
				return;
			} else {
				adminService.changeOrderStatus(req, res);
			}
		}
	} catch (error) {
		logger.error(error);
		sendServerErrorResponse(res);
	}
};

/**
 * @description Retrieves the filtered orders
 * @param req
 * @param res
 */
exports.getFilteredOrders = async (req: Request, res: Response) => {
	try {
		// If no filter condition is given, throw bad request.
		const { employeeId, status, location } = req.body;
		if (!employeeId && !status && !location) {
			logger.error("Empty filter");
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				{ error: orderFilterErrorMessages.FILTER_REQUIRED },
				res,
			);
		} else {
			const errorMap = await classValidate(
				OrderFilterDTO,
				employeeId,
				status,
				location,
			);
			if (Object.keys(errorMap).length) {
				logger.error(
					"Get Filtered Orders Controller - Class validator error",
				);
				sendResponse(
					statusMessages.BAD_REQUEST,
					statusCodes.BAD_REQUEST,
					{ errorMap },
					res,
				);
				return;
			}
			adminService.filterOrders(req, res);
		}
	} catch (error) {
		logger.error("Get Filtered Orders Controller - Server error");
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			statusMessages.SERVER_ERROR,
			res,
		);
	}
};

/**
 * @description Get All Orders List
 * @param req
 * @param res
 * @returns void
 */
exports.getOrdersList = (req: Request, res: Response) => {
	try {
		adminService.getAllOrders(req, res);
	} catch (error) {
		logger.error("Server Error : ", JSON.stringify(error));
		sendServerErrorResponse(res);
	}
};
