// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { Request, Response } from "express";
import { validate } from "class-validator";
import { LoginDTO } from "../dto/login.dto";
import { logger } from "../logger/logger";
const { statusMessages, statusCodes } = require("../constants");
const { sendResponse } = require("../helpers/json.helper");
const { generateErrorResponseObj } = require("../helpers/common.helpers");
const { loginUser, resetPassword } = require("../services/auth.services");

/**
 *  This function calls loginUser service to handle user login
 * @param {Request} req
 * @param {Response} res
 */
exports.loginUser = async (req: Request, res: Response) => {
	try {
		const orderList = new LoginDTO(req.body.email, req.body.password);
		const errors = await validate(orderList);
		if (errors.length > 0) {
			logger.info("Request body validation fail");
			sendResponse(
				statusMessages.ERROR,
				statusCodes.BAD_REQUEST,
				{ ...generateErrorResponseObj(statusMessages.INVALID_CREDENTIALS) },
				res,
			);
		} else {
			loginUser(req, res);
		}
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
 *  This controller helps in resetting password
 * @param {Request} req
 * @param {Response} res
 */
exports.resetPassword = async (req: Request, res: Response) => {
	try {
		if (req.body.email) {
			resetPassword(req, res);
		} else {
			logger.info("Request body validation fail");
			sendResponse(
				statusMessages.ERROR,
				statusCodes.BAD_REQUEST,
				{ ...generateErrorResponseObj(statusMessages.BAD_REQUEST) },
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
	}
};
