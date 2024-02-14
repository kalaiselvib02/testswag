import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../logger/logger";

const {
	tokenValidator,
	tokenDecode,
	getTokenFromHeader,
} = require("../helpers/token.helper");
const { statusMessages, statusCodes } = require("../constants");
const { sendResponse } = require("../helpers/json.helper");
const { generateErrorResponseObj } = require("../helpers/common.helpers");

/**
 * Authenticates user by verifying the token in bearer
 *  @param {Request} req
 *  @param {Response} res
 *  @param {NextFunction} next
 */
const authenticateToken = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	let validUser = false;
	try {
		const bearerToken = getTokenFromHeader(req.headers);
		validUser = tokenValidator(bearerToken);
		if (validUser) {
			const decodedToken = tokenDecode(bearerToken);
			res.locals.employeeinfo = {
				employeeId: decodedToken.employeeId,
				name: decodedToken.name,
				role: decodedToken.role,
				location: decodedToken.location,
			};
			next();
			logger.info("User Authenticated");
		}
		// If tokenValidator returns null then the user is not a valid user
		if (!validUser) {
			const data = {
				isSuccess: false,
				error: {
					message: statusMessages.UNAUTHORIZED,
				},
			};
			// This function helps in sending response.
			sendResponse(statusMessages.ERROR, statusCodes.UNAUTHORIZED, data, res);
		}
	} catch (error) {
		// This function helps in sending response.
		sendResponse(
			statusMessages.ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
	}
};

/**
 * This function will authorize the user by their role
 * @param {Number} expectedRole
 */
const authorize = (expectedRole: number) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const bearerToken = getTokenFromHeader(req.headers);
			const decodedToken = tokenDecode(bearerToken);
			const actualRole = decodedToken.role;
			// Check if the user has the expected role
			if (expectedRole === actualRole) {
				next();
			} else {
				// const data = {
				// 	isSuccess: false,
				// 	error: {
				// 		message: statusMessages.UNAUTHORIZED,
				// 	},
				// };

				// This function helps in sending response.
				sendResponse(
					statusMessages.ERROR,
					statusCodes.UNAUTHORIZED,
					{ ...generateErrorResponseObj(statusMessages.UNAUTHORIZED) },
					res,
				);
			}
		} catch (error) {
			// This function helps in sending response.

			sendResponse(
				statusMessages.ERROR,
				statusCodes.INTERNAL_SERVER_ERROR,
				{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
				res,
			);
		}
	};
};
module.exports = { authenticateToken, authorize };
