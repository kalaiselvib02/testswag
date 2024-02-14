import { type Request, type Response } from "express";
const { getApiData } = require("../helpers/fetch.data.helper");
const { walletEncodedToken } = require("../helpers/token.helper");
const { statusMessages, statusCodes, apiConstants } = require("../constants");
const { sendResponse } = require("../helpers/json.helper");
const { generateErrorResponseObj } = require("../helpers/common.helpers");

/**
 *   This function retrieves all employees from wallet
 * @param {Request} req
 * @param {Response} res
 */
exports.getAllEmployees = async (req: Request, res: Response) => {
	try {
		const walletUsers = await getApiData(
			apiConstants.WALLET_USERS_LIST,
			walletEncodedToken(),
		);
		sendResponse(statusMessages.SUCCESS, statusCodes.OK, walletUsers.data, res);
	} catch (e: any) {
		sendResponse(
			e.statusText ? e.statusText : statusMessages.ERROR,
			e.status ? e.status : statusCodes.SERVER_ERROR,
			e.data ? 
			{ ...generateErrorResponseObj(e.data) }
			: 
			{ ...generateErrorResponseObj(statusMessages.SERVER_ERROR) },
			res,
		);
	}
};
