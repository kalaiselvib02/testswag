import { type Request, type Response } from "express";
import { validate } from "class-validator";
import { OrdersListDTO } from "../dto/ordersList.dto";
import { CancelOrder } from "../dto/order.dto";
import { RemoveCartItemDTO } from "../dto/cart.dto";
import { logger } from "../logger/logger";
import { type UserInfo } from "../types/user.type";
import { RESPONSE_CONSTANTS, statusCodes, statusMessages } from "../constants";
const { sendResponse, sendServerErrorResponse } = require("../helpers/json.helper");
const { getUserPoints } = require("../user/user.service");
const userService = require("./user.service");
const { classValidationErrorMessages } = require("../helpers/common.helpers");
const {
	classValidate,
	generateErrorResponseObj,
} = require("../helpers/common.helpers");

exports.placeOrder = async (req: Request, res: Response) => {
	logger.info("Entering in User Controller - Place Order");
	try {
		// validate req body
		const orderItems = new OrdersListDTO(req.body);
		const errors = await validate(orderItems);
		if (errors.length > 0) {
			const errorObject = {
				...generateErrorResponseObj(
					RESPONSE_CONSTANTS.ORDER.NOT_PLACED.MESSAGE,
				),
				errors: classValidationErrorMessages(errors),
			};
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				errorObject,
				res,
			);
		} else {
			await userService.placeOrder(req, res);
		}
		logger.info("Exiting User Controller - Place Order - Successfully");
	} catch (e: any) {
		logger.error("Error in User Controller - Place Order", e);
		const errorObject = {
			...generateErrorResponseObj(RESPONSE_CONSTANTS.ORDER.NOT_PLACED.MESSAGE),
		};
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			errorObject,
			res,
		);
	}
};

/**
 *  This controller calls getOrdersByEmployeeId function from user service which sends the orders response
 * @param {Request} req
 * @param {Response} res
 */
exports.getOrdersByEmployeeId = (req: Request, res: Response) => {
	try {
		userService.getOrdersByEmployeeId(req, res);
	} catch (error) {
		logger.error("server error" + JSON.stringify(error));
		sendServerErrorResponse(res);
	}
};

/**
 *  This controller calls getUserPoints function from user service which retrieves user points by employee id
 * @param {Request} req
 * @param {Response} res
 */
exports.getUserPoints = (req: Request, res: Response) => {
	try {
		getUserPoints(req, res);
	} catch (error) {
		logger.error("Server Error : ", error);
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(null) },
			res,
		);
	}
};

/**
 * @description Get all products List
 * @param {Request} req
 * @param {Response} res
 */
exports.getProductsList = (req: Request, res: Response) => {
	try {
		userService.getAllProducts(req, res);
	} catch (error) {
		logger.info("Fetch Products Failed - Server Error");
	}
};

/**
 * @description Get all rewards of the user
 * @param {Request} req
 * @param {Response} res
 * @returns void
 */
exports.getUserRewards = async (req: Request, res: Response) => {
	try {
		// Get EmployeeId from token
		const employeeinfo: UserInfo = res.locals.employeeinfo;
		const employeeId = employeeinfo.employeeId;
		await userService.getAllUserRewards(employeeId, req, res);
	} catch (error) {
		logger.error(error);
		sendServerErrorResponse(res);
	}
};

/**
 * @description Get all transactions of the user
 * @param {Request} req
 * @param {Response} res
 * @returns void
 */
exports.getUserTransactions = async (req: Request, res: Response) => {
	try {
		// Get EmployeeId from token
		const employeeinfo: UserInfo = res.locals.employeeinfo;
		const employeeId = employeeinfo.employeeId;
		await userService.getAllUserTransactions(employeeId, req, res);
	} catch (error) {
		logger.error(error);
		sendServerErrorResponse(res);
	}
};

/**
 *  This controller calls getProductColors function from user service which retrieves user product colors
 * @param {Request} req
 * @param {Response} res
 */
exports.productColors = (req: Request, res: Response) => {
	try {
		userService.getProductColors(req, res);
	} catch (error) {
		logger.error("Server Error : ", error);
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(null) },
			res,
		);
	}
};

/**
 *  This controller calls getProductSizes function from user service which retrieves user product sizes
 * @param {Request} req
 * @param {Response} res
 */
exports.productSizes = (req: Request, res: Response) => {
	try {
		userService.getProductSizes(req, res);
	} catch (error) {
		logger.error("Server Error : ", error);
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(null) },
			res,
		);
	}
};

/**
 *  This controller calls cancelUserOrder service to cancel order
 * @param {Request} req
 * @param {Response} res
 */
exports.cancelOrder = async (req: Request, res: Response) => {
	const { orderId, changeTo } = req.body;
	try {
		const errorMap = await classValidate(CancelOrder, orderId, changeTo);
		if (Object.keys(errorMap).length) {
			logger.error("Cancel Orders Controller - Class validator error");
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				{ errorMap },
				res,
			);
			return;
		}
		userService.cancelUserOrder(req, res);
	} catch (error) {
		logger.error("Server Error : ", error);
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
	}
};
exports.updateCart = async (req: Request, res: Response) => {
	logger.info("Entering in User Controller - Update Cart");
	try {
		// validate req body
		const cartItems = new OrdersListDTO(req.body);
		const errors = await validate(cartItems);
		if (errors.length > 0) {
			const errorObject = {
				...generateErrorResponseObj(
					RESPONSE_CONSTANTS.CART.NOT_PLACED.MESSAGE,
				),
				errors: classValidationErrorMessages(errors),
			};
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				errorObject,
				res,
			);
		} else {
			await userService.updateCart(req, res);
		}
		logger.info("Exiting User Controller - Update Cart - Successfully");
	} catch (error: any) {
		const errorObject = {
			...generateErrorResponseObj(RESPONSE_CONSTANTS.CART.NOT_PLACED.MESSAGE),
		};
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			errorObject,
			res,
		);
		logger.error("Error in User Controller - Update Cart", error);
	}
};

exports.getCart = async (req: Request, res: Response) => {
	logger.info("Entering User Controller - Get Cart");
	try {
		await userService.getCart(req, res);
		logger.info("Exiting User Controller - Get Cart");
	} catch (error: any) {
		logger.error("Error in User Controller - Get Cart", error);
	}
};

exports.getCOItems = async (req: Request, res: Response) => {
	logger.info("Entering User Controller - Get Checkout Items");
	try {
		await userService.getCOItems(req, res);
		logger.info("Exiting User Controller - Get Checkout Items");
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (error: any) {
		logger.error(
			"Error in User Controller - Get Checkout Items" + JSON.stringify(error),
		);
		sendServerErrorResponse(res);
	}
};

/**
 *  This controller calls cancelUserOrder service to cancel order
 * @param {Request} req
 * @param {Response} res
 */
exports.deleteCart = async (req: Request, res: Response) => {
	const productId = req.body.productId;
	try {
		const errorMap = await classValidate(RemoveCartItemDTO, productId);
		if (Object.keys(errorMap).length) {
			logger.error("Remove Cart Item Controller - Class validator error");
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				{ errorMap },
				res,
			);
			return;
		}
		userService.removeCartItem(req, res);
	} catch (error) {
		logger.error("Server Error : ", error);
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
	}
};

/**
 *  This controller calls claimReward service to claim reward points
 * @param {Request} req
 * @param {Response} res
 */
 exports.claimReward = async (req: Request, res: Response) => {
	const couponCode = req.body.couponCode;
	const secretCode = req.body.secretCode;
	try {
		if(!couponCode || !secretCode) {
			logger.error("Bad Request - Coupon Validation : ", );
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				res,
			);
			return;
		}
		await userService.claimUserReward(req , res)
	} catch (error) {
		logger.error("Server Error : ", error);
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
	}
};
