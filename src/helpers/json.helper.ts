/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Response } from "express";
import { statusCodes, statusMessages } from "../constants";

const sendServerErrorResponse = (res: Response): void => {
	sendResponse(
		statusMessages.SERVER_ERROR,
		statusCodes.INTERNAL_SERVER_ERROR,
		"",
		res,
	);
};

const sendEmptyRequestResponse = (res: Response): void => {
	sendResponse(statusMessages.EMPTY_REQUEST, statusCodes.BAD_REQUEST, "", res);
};

const sendResponse = (
	status: string,
	code: number,
	data: any,
	res: Response,
): void => {
	res.status(code).json({
		status,
		code,
		data,
	});
};

module.exports = {
	sendResponse,
	sendServerErrorResponse,
	sendEmptyRequestResponse,
};
