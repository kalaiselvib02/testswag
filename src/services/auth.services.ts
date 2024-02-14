import { type Request, type Response } from "express";
import { logger } from "../logger/logger";
import { type AccessTokenPayload } from "../types/token.type";
const User = require("../schemas/user.schema");
const Location = require("../schemas/location.schema");
const { postApiData } = require("../helpers/fetch.data.helper");
const { tokenGenerator } = require("../helpers/token.helper");
const { sendResponse } = require("../helpers/json.helper");
const { generateErrorResponseObj } = require("../helpers/common.helpers");
const {
	getUserRoleId,
	getUserRole,
	getUserLocationId,
} = require("../helpers/db.helpers");
const {
	statusMessages,
	statusCodes,
	roleConstants,
	apiConstants,
} = require("../constants");
/**
 *  This function is to create a token when a user is being authenticated
 * @param {Request} req
 * @param {Response} res
 */
exports.loginUser = async (req: Request, res: Response) => {
	try {
		let { email, password } = req.body;
		email = email.toLowerCase();
		const tokenPayload: AccessTokenPayload = {
			email,
			password,
		};
		/*
\		 * If wallet login fails, execution goes to catch block
		 */
		const walletLoginResult = await postApiData(
			apiConstants.WALLET_LOGIN,
			tokenPayload,
		);
		logger.info("Wallet login successful");
		// Find user in db using email
		const findUser = await User.findOne({ email });

		let role;
		// Add user if not present in db
		if (!findUser) {
			// Setting role as user for new User
			logger.info("User not in db. Creating user...");
			role = roleConstants.USER;
			const newUser = {
				employeeId: walletLoginResult?.data?.employeeId,
				name: walletLoginResult?.data?.name,
				email: walletLoginResult?.data?.email,
				location: await getUserLocationId(
					walletLoginResult?.data?.locationDetails?.name?.toUpperCase(),
				),
				role: await getUserRoleId(roleConstants.USER),
			};
			// New user Pushed to User Collections
			await User.create(newUser);
			logger.info("User created successfully");
		} else {
			role = await getUserRole(findUser.role);
		}
		// Generate token for validated user
		const token = tokenGenerator({
			employeeId: walletLoginResult?.data?.employeeId,
			name: walletLoginResult?.data?.name,
			role,
			location: walletLoginResult?.data?.locationDetails?.name,
		});
		logger.info("Token Successfully generated");

		const responseData = {
			isSuccess: walletLoginResult?.data?.isSuccess,
			token,
		};
		sendResponse(
			statusMessages.SUCCESS,
			walletLoginResult?.status,
			responseData,
			res,
		);
		logger.info("User successfully authenticated");
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		// console.log(e.data)
		// If Wallet login is not successful, the response will be caught here. For any other error caught the error status, code and message is sent.
		sendResponse(
			e.statusText ? e.statusText : statusMessages.ERROR,
			e.status ? e.status : statusCodes.INTERNAL_SERVER_ERROR,
			e.data ?? { ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
		logger.info("User login Failed");
	}
};

/**
 *   This function helps in password reset
 * @param {Request} req
 * @param {Response} res
 */
exports.resetPassword = async (req: Request, res: Response) => {
	try {
		const passwordResetResult = await postApiData(
			apiConstants.WALLET_RESET_PASSWORD,
			{
				email: req.body.email,
			},
		);
		const responseData = {
			isSuccess: passwordResetResult.data.isSuccess,
		};
		sendResponse(
			passwordResetResult.statusText,
			passwordResetResult.status,
			responseData,
			res,
		);
		logger.info("Email Successfully Sent");
	} catch (e: any) {
		// If Wallet reset password is not successful, the response will be caught here. For any other error caught the error status, code and message is sent.
		sendResponse(
			e.statusText ? e.statusText : statusMessages.ERROR,
			e.status ? e.status : statusCodes.INTERNAL_SERVER_ERROR,
			e.data ? 
			{ ...generateErrorResponseObj(e.data ) }
			: 
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
		logger.info("Wallet Login Failed");
	}
};
