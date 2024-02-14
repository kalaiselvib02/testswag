import { logger } from "../logger/logger";
import {
	uploadRewards,
	createRewards,
	getRewards,
	getRewardCategories,
	sendFilteredRewards,
	scheduleExpirationJob,
	cancelExpirationJob,
} from "./hr.service";
import { type Request, type Response } from "express";

const {
	sendEmptyRequestResponse,
	sendServerErrorResponse,
} = require("../helpers/json.helper");

/**
 * @param req
 * @param res
 * @returns void
 */
export const bulkUploadRewards: (
	req: Request,
	res: Response,
) => Promise<void> = async (req, res) => {
	try {
		if (req.file) {
			const rewardsFile = req.file;
			await uploadRewards(rewardsFile, res);
		} else {
			sendEmptyRequestResponse();
		}
	} catch (e) {
		logger.error(e);
		sendServerErrorResponse(res);
	}
};

/**
 * @param req
 * @param res
 * @returns void
 */
export const bulkCreateRewards: (
	req: Request,
	res: Response,
) => Promise<void> = async (req, res) => {
	try {
		if (req.body) {
			await createRewards(req.body, res);
		} else {
			sendEmptyRequestResponse();
		}
	} catch (e: any) {
		logger.error(
			"Error caught in controller while bulk creating rewards: " +
				JSON.stringify(e?.message),
		);
	}
};

/**
 * @param req
 * @param res
 * @returns void
 */
export const getAllRewards: (req: Request, res: Response) => Promise<void> = async (
	req,
	res,
) => {
	try {
		await getRewards(req, res);
	} catch (e) {
		sendServerErrorResponse(res);
	}
};

/**
 * @param req
 * @param res
 * @returns void
 */
export const getAllFilteredRewards: (
	req: Request,
	res: Response,
) => Promise<void> = async (req, res) => {
	try {
		await sendFilteredRewards(req, res);
	} catch (e) {
		sendServerErrorResponse(res);
	}
};

/**
 * @param req
 * @param res
 * @returns void
 */
export const getAllRewardCategories: (
	req: Request,
	res: Response,
) => Promise<void> = async (req, res) => {
	try {
		await getRewardCategories(req, res);
	} catch (e: any) {
		logger.error(
			"Error caught in controller while getting the reward categories: " +
				e?.message,
		);
		sendServerErrorResponse(res);
	}
};

/**
 * @param req
 * @param res
 * @returns void
 */
export const scheduleExpiration: (
	req: Request,
	res: Response,
) => Promise<void> = async (req, res) => {
	try {
		await scheduleExpirationJob(req, res);
	} catch (e: any) {
		logger.error(
			"Error caught in controller while scheduling expiration:" + e?.message,
		);
	}
};

/**
 * @param req
 * @param res
 * @returns void
 */
export const cancelExpiration: (
	req: Request,
	res: Response,
) => Promise<void> = async (req, res) => {
	try {
		await cancelExpirationJob(req, res);
	} catch (e: any) {
		logger.error(
			"Error caught in controller while canceling expiration:" + e?.message,
		);
	}
};
