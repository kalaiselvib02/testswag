/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	type RewardDTO,
	type Reward,
	RewardFiltersDTO,
} from "../types/rewards.type";
import fs from "fs";
import {
	statusCodes,
	statusMessages,
	scheduleExpirationMessages,
} from "../constants/response.constants";
import { createXLFromData, getJSONFromSheet } from "../helpers/xl.helper";
import { sendEmail } from "../helpers/email.helper";
import { type UserInfo, type User } from "../types/user.type";
import { type User as UserSchemaType } from "../schemas/user.schema";
import { logger } from "../logger/logger";
import {
	getUserByEmpId,
	getUserById,
	getUserLocationId,
	getUserRoleId,
} from "../helpers/db.helpers";
import { EMPTY_STRING, HYPHEN, SPACE } from "../constants/common.constants";
import {
	expectedRewardKeys,
	errorMessages,
	filterErrorMessages,
	logMessages,
	rewardCategories,
	COUPONS_EMAIL_CONTENT,
} from "../constants/hr.constants";
import { couponEmail } from "../constants/message.constants";
import { type Request, type Response } from "express";
import moment from "moment";
import { type RewardCategories } from "../schemas/rewardCategories.schema";
import {
	checkPaginationAndRespond,
	getDateSortingFactor,
} from "../helpers/pagination.helper";
import { type Model } from "mongoose";
import crypto from "crypto";
import { cryptTheCoupon } from "../helpers/coupon.helpers";
import { type CouponDetails } from "../types/CouponDetails.type";
import {
	createMultiPagePDFwithData,
	createPDFWithData,
	passwordProtectPDF,
} from "../helpers/pdf.helper";
import { type WalletUser } from "../types/WalletUser.type";
import { apiConstants, roleConstants } from "../constants";
import { type Role } from "../types/role.type";

const { walletEncodedToken } = require("../helpers/token.helper");
const { getApiData } = require("../helpers/fetch.data.helper");
const { sendEmptyRequestResponse, sendResponse } = require("../helpers/json.helper");
const RewardModel: Model<Reward> = require("../schemas/reward.schema");
const RewardCategoriesModel: Model<RewardCategories> = require("../schemas/rewardCategories.schema");
const TransactionModel = require("../schemas/transaction.schema");
const UserModel: Model<UserSchemaType> = require("../schemas/user.schema");
const {
	parseIntegerValue,
	generateErrorResponseObj,
} = require("../helpers/common.helpers");
const { classValidate } = require("../helpers/common.helpers");
const JobSchema = require("../schemas/job.schema");
const JobLogSchema = require("../schemas/jobLog.schema");

let walletUsers: WalletUser[];
let userRole: Role, hrRole: Role;
/**
 * @description if the given empId exists in walletUsers, returns a newly created user
 * @param number
 * @returns User
 */
const createWalletUser = async (
	empId: number,
	isHRContext: boolean = false,
): Promise<User | null> => {
	const newUser: WalletUser | undefined = walletUsers?.find(
		(walletUser: WalletUser) => walletUser.employeeId === empId,
	);
	if (newUser) {
		const { employeeId, name, email, location } = newUser;
		const userLocation = await getUserLocationId(location?.toUpperCase());
		const userToCreate: User = {
			employeeId,
			name,
			email,
			location: userLocation,
			role: isHRContext ? hrRole : userRole,
		};
		const user = await UserModel.create(userToCreate);
		return user;
	}
	return null;
};

/**
 * Validates a reward and returns a displayable object
 * @param reward
 * @returns
 */
const validateReward: (reward: any) => Promise<Reward> | never = async (reward) => {
	const responseObject = { ...reward };
	try {
		if (reward.addedBy && reward.rewardee) {
			const rewarderValue: number = parseIntegerValue(reward.addedBy);
			const rewardeeValue: number = parseIntegerValue(reward.rewardee);
			let rewarder: User | null = await getUserByEmpId(rewarderValue);
			let rewardee: User | null = await getUserByEmpId(rewardeeValue);
			if (!rewarder && walletUsers) {
				rewarder = await createWalletUser(rewarderValue, true);
				if (!rewarder) {
					throw new Error(logMessages.invalidEmployeeId);
				}
			} else if (!walletUsers) {
				throw new Error(logMessages.walletCommFailure);
			}
			if (!rewardee && walletUsers) {
				rewardee = await createWalletUser(rewardeeValue);
				if (!rewardee) {
					throw new Error(logMessages.invalidEmployeeId);
				}
			} else if (!walletUsers) {
				throw new Error(logMessages.walletCommFailure);
			}
			responseObject.addedBy = [rewarderValue, HYPHEN, rewarder.name].join(
				SPACE,
			);
			responseObject.rewardee = [rewardeeValue, HYPHEN, rewardee.name].join(
				SPACE,
			);
		} else {
			throw new Error(logMessages.invalidEmployeeId);
		}
		if (
			typeof reward.rewardCategory !== "string" ||
			typeof reward.description !== "string"
		) {
			throw new Error(logMessages.catDescInvalid);
		}
		if (typeof reward.rewardPoints !== "number") {
			try {
				if (typeof reward.rewardPoints !== "string") {
					throw new Error(logMessages.pointsInvalid);
				}
				responseObject.rewardPoints = parseIntegerValue(reward.rewardPoints);
			} catch (e) {
				throw new Error(logMessages.pointsInvalid);
			}
		}
		if (responseObject.rewardPoints < 0) {
			throw new Error(logMessages.pointsInvalid);
		}
		responseObject.date = moment(Date.now()).format("DD MMM YYYY");
		return responseObject;
	} catch (e: any) {
		throw new Error(
			logMessages.invalidReward + SPACE + e.message ? e.message : EMPTY_STRING,
		);
	}
};

/**
 * @description Validates all rewards and sends response rewards and if there were any failure
 * @param rewards from the xl
 * @returns responseRewards and failureStatus
 */
const validateRewards = async (
	rewards: any[],
): Promise<{ responseRewards: Reward[]; failureStatus: boolean }> => {
	let failureStatus = false;
	const responseRewards: Reward[] = [];
	// assigning fresh data
	const walletUsersList = await getApiData(
		apiConstants.WALLET_USERS_LIST,
		walletEncodedToken(),
	);
	walletUsers = walletUsersList?.data;
	userRole = await getUserRoleId(roleConstants.USER);
	hrRole = await getUserRoleId(roleConstants.HR);
	for (const reward of rewards) {
		try {
			reward.isErroneous = false;
			responseRewards.push(await validateReward(reward));
		} catch (err: any) {
			failureStatus = true;
			reward.isErroneous = true;
			responseRewards.push(reward);
			logger.error(
				err.message + " error occured in " + JSON.stringify(reward),
			);
		}
	}
	return { responseRewards, failureStatus };
};

/**
 * @description parses empString like emp_id - emp_name and returns emp_id
 * @param empString
 * @returns number | undefined
 */
const getEmpIdFromEmpString = (
	empString: string | undefined | null,
): number | undefined => {
	empString =
		typeof empString === "string"
			? empString.replace(/\s/g, "").split(HYPHEN)?.[0]
			: undefined;
	return empString?.length ? parseInt(empString) : undefined;
};

const parseReward: (reward: any) => Promise<Reward> = async (reward) => {
	try {
		const rewarderEmpId = getEmpIdFromEmpString(reward.addedBy);
		const rewardeeEmpId = getEmpIdFromEmpString(reward.rewardee);
		if (
			rewarderEmpId &&
			rewardeeEmpId &&
			reward.rewardPoints &&
			reward.rewardCategory?.length &&
			typeof reward.rewardCategory === "string"
		) {
			const rewarderValue: number = parseIntegerValue(rewarderEmpId);
			const rewardeeValue: number = parseIntegerValue(rewardeeEmpId);
			let rewarder: User | null = await getUserByEmpId(rewarderValue);
			let rewardee: User | null = await getUserByEmpId(rewardeeValue);
			if (!rewarder && walletUsers) {
				rewarder = await createWalletUser(rewarderValue, true);
				if (!rewarder) {
					throw new Error(logMessages.invalidEmployeeId);
				}
			} else if (!walletUsers) {
				throw new Error(logMessages.walletCommFailure);
			}
			if (!rewardee && walletUsers) {
				rewardee = await createWalletUser(rewardeeValue);
				if (!rewardee) {
					throw new Error(logMessages.invalidEmployeeId);
				}
			} else if (!walletUsers) {
				throw new Error(logMessages.walletCommFailure);
			}
			reward.addedBy = rewarder._id;
			reward.rewardee = rewardee._id;
			reward.employeeId = rewardee.employeeId;
			reward.rewardPoints = parseIntegerValue(reward.rewardPoints);
			return reward;
		} else {
			return null;
		}
	} catch (e: any) {
		logger.error("error while parsing: " + e.message);
		return null;
	}
};

const XLSkeletonCheck = (actualRewardKeys: string[]): boolean => {
	return expectedRewardKeys.every((expectedRewardKey) =>
		actualRewardKeys.includes(expectedRewardKey),
	);
};

/**
 * @description validates and sets the response with json of displayable records with isErroneous: true || false
 * @param rewardsFile: Express.Multer.File
 * @returns void
 */
export const uploadRewards: (
	rewardsFile: Express.Multer.File,
	res: Response,
) => Promise<void | never> = async (rewardsFile, res) => {
	// Extracting the rewards from the XL
	let rewards: any[] | null = null;
	if (rewardsFile?.path) {
		rewards = getJSONFromSheet(rewardsFile);
	}

	// Checking if it was an empty request
	if (!rewards?.length) {
		sendEmptyRequestResponse();
		return;
	}

	// checking the XL Skeleton
	const actualRewardKeys = Object.keys(rewards[0]);
	if (!XLSkeletonCheck(actualRewardKeys)) {
		sendResponse(
			statusMessages.BAD_REQUEST,
			statusCodes.BAD_REQUEST,
			{
				errorMessage: errorMessages.WRONG_XL_SKELETON,
			},
			res,
		);
		return;
	}

	// Validating the rewards and setting the response
	const { responseRewards, failureStatus } = await validateRewards(rewards);
	failureStatus
		? sendResponse(
				statusMessages.PARTIAL_SUCCESS,
				statusCodes.MULTI_STATUS,
				{
					rewards: responseRewards,
				},
				res,
		  )
		: sendResponse(
				statusMessages.SUCCESS,
				statusCodes.OK,
				{
					rewards: responseRewards,
				},
				res,
		  );
};

/**
 * Sends email about reward to rewardees
 * @param reward
 */
export const sendRewardEmail = async (reward: Reward): Promise<void> => {
	try {
		logger.info("reward received in sendRewardEmail: " + JSON.stringify(reward));
		const rewardee: any = await getUserById(reward.rewardee.toString());
		let secretCodePDFPath, protectedPdfPath;
		if (reward.secretCode) {
			logger.info("Before reward pdf creation:" + JSON.stringify(reward));
			secretCodePDFPath = await createPDFWithData(reward);
			logger.info("Before password protection:" + JSON.stringify(reward));
			protectedPdfPath = passwordProtectPDF(
				secretCodePDFPath,
				rewardee,
				false,
			);
		}
		logger.info("After password protection:" + JSON.stringify(reward));
		if (rewardee?.email && secretCodePDFPath && protectedPdfPath) {
			// TO-DO: toAddress won't be from process.env in the end. It's just for checking so real emails don't go to the actual people.
			await sendEmail(
				{
					toAddress: rewardee.email,
					...couponEmail(reward, rewardee),
				},
				[
					{
						path: protectedPdfPath,
					},
				],
			);
			fs.unlink(secretCodePDFPath, (err: any) => {
				if (err) {
					logger.error("Error deleting file:", err);
				}
			});
			fs.unlink(protectedPdfPath, (err: any) => {
				if (err) {
					logger.error("Error deleting file:", err);
				}
			});
		} else {
			logger.error(
				"Rewardee email not available to send mail for the rewardee:" +
					reward.rewardee,
			);
		}
	} catch (e) {
		logger.error(
			"Rewardee email not available to send mail for the rewardee:" +
				reward?.rewardee,
		);
	}
};

/**
 * @description creates a transaction for a given record
 * @param reward
 * @returns TransactionId
 */
export const createTransaction = async (reward: Reward): Promise<object> => {
	let description;
	const rewardCategory = reward.rewardCategory?.name;
	if (!rewardCategory) {
		throw new Error(logMessages.catDescInvalid);
	}
	const formattedRewardCategory = rewardCategory.replace(/\s/g, "")?.toLowerCase();
	switch (formattedRewardCategory) {
		case rewardCategories.award:
			description = reward.description;
			break;
		case rewardCategories.evento:
			description = [rewardCategory, HYPHEN, reward.description].join(SPACE);
			break;
		default:
			description = [rewardCategory, reward.description].join(SPACE);
			break;
	}
	const transaction = await TransactionModel.create({
		employeeId: reward.employeeId,
		description,
		isCredited: true,
		amount: reward.rewardPoints,
	});
	return transaction._id;
};

/**
 * @description gets or creates and returns rewardCategory object
 * @param rewardCategory string
 * @returns object of rewardCategory
 */
const createOrGetRewardCategory = async (
	rewardCategory: string,
): Promise<object | null> => {
	try {
		let creationFlag = false;
		let rewardCategoryObject = await RewardCategoriesModel.findOne({
			name: rewardCategory,
		});
		if (!rewardCategoryObject?.name) {
			creationFlag = true;
			rewardCategoryObject = await RewardCategoriesModel.create({
				name: rewardCategory,
			});
		}
		return { rewardCategoryObject, creationFlag };
	} catch (e: any) {
		logger.error("Error while upserting reward category:" + e?.message);
		return null;
	}
};

/**
 * @description verifies and sets the response of {isSuccess: true || false}
 * @param rewardsFile: Express.Multer.File
 * @returns void
 */
export const createRewards: (
	rewards: any[],
	res: Response,
) => Promise<void> = async (rewards, res) => {
	// handling empty request case
	if (!rewards.length) {
		sendEmptyRequestResponse();
		return;
	}
	const { employeeId } = res.locals.employeeinfo;
	// saving the valid rewards
	let isSuccess = true;
	const savedRewards: Reward[] = [];
	// assigning fresh data
	const walletUsersList = await getApiData(
		apiConstants.WALLET_USERS_LIST,
		walletEncodedToken(),
	);
	walletUsers = walletUsersList?.data;
	userRole = await getUserRoleId(roleConstants.USER);
	hrRole = await getUserRoleId(roleConstants.HR);
	for (const reward of rewards) {
		// parsing the reward
		const parsedReward: Reward = await parseReward(reward);
		if (!parsedReward) {
			isSuccess = false;
			continue;
		}
		let creationFlag;
		try {
			// creating/getting category for the reward
			const rewardCategoryRes: any = await createOrGetRewardCategory(
				parsedReward.rewardCategory,
			);
			parsedReward.rewardCategory = rewardCategoryRes?.rewardCategoryObject;
			creationFlag = rewardCategoryRes?.creationFlag;
			// Coupon Generation
			const couponDetails: CouponDetails = await generateCoupon();
			const encryptedCouponCode = couponDetails.encryptedCouponCode;
			if (!encryptedCouponCode) {
				throw new Error("Coupon code encryption failed");
			}
			parsedReward.encryptedCouponCode = encryptedCouponCode;
			// temp storing the rewardee for email and removing so it stays an unassigned coupon in db.
			const rewardee = parsedReward?.rewardee;
			delete parsedReward["rewardee"];

			const savedReward: Reward = await RewardModel.create(parsedReward);
			savedReward.couponCode = couponDetails.couponCode;
			savedReward.secretCode = couponDetails.secretCode;
			savedRewards.push(savedReward);
			// adding the rewardee for email.
			savedReward.rewardee = rewardee;
		} catch (e: any) {
			isSuccess = false;
			// rolling back transaction if created
			if (parsedReward.transactionId) {
				TransactionModel.findByIdAndDelete(parsedReward.transactionId);
			}
			// rolling back rewardCategory if created
			if (parsedReward.rewardCategory?._id && creationFlag) {
				await RewardCategoriesModel.findByIdAndDelete(
					parsedReward.rewardCategory._id,
				);
			}
			logger.error("Invalid reward not created due to:" + e.message);
		}
	}
	// setting the response and sending the mail
	sendResponse(
		isSuccess ? statusMessages.SUCCESS : statusMessages.ERROR,
		isSuccess ? statusCodes.CREATED : statusCodes.BAD_REQUEST,
		{ isSuccess },
		res,
	);
	await sendHREmail(savedRewards, employeeId);
	for (const savedReward of savedRewards) {
		// Generate Coupons and PDFs for Users
		await sendRewardEmail(savedReward);
	}
	logger.info("Mails sent for the rewards created by HR");
};

const formatSavedRewards = async (savedRewards: Reward[]): Promise<Reward[]> => {
	const rewards: Reward[] = [];
	for (const savedReward of savedRewards) {
		let {
			rewardee,
			rewardCategory,
			description,
			rewardPoints,
			addedBy,
			couponCode,
		} = savedReward;
		rewardCategory = rewardCategory?.name;
		rewardee = await UserModel.findById(rewardee);
		rewardee = [rewardee?.employeeId, HYPHEN, rewardee?.name].join(SPACE);
		addedBy = await UserModel.findById(addedBy);
		addedBy = [addedBy?.employeeId, HYPHEN, addedBy?.name].join(SPACE);

		rewards.push({
			rewardee,
			rewardCategory,
			description,
			rewardPoints,
			addedBy,
			couponCode,
		});
	}
	return rewards;
};

/**
 * @description sends HR rewards
 * @param rewards
 * @returns void
 */
const sendHREmail = async (
	savedRewards: Reward[],
	employeeId: number,
): Promise<void> => {
	const hr: UserSchemaType | null = await UserModel.findOne({ employeeId });
	const hrEmailAddress = hr?.email;
	if (hrEmailAddress) {
		const formattedRewards: Reward[] = await formatSavedRewards(savedRewards);
		const totalRewardsCreated = formattedRewards?.length;
		const xlPath = createXLFromData(formattedRewards);
		const pdfPath = await createMultiPagePDFwithData(formattedRewards);
		// const protectedPdfPath = passwordProtectPDF(pdfPath, hr, true);
		if (xlPath && pdfPath) {
			await sendEmail(
				{
					...COUPONS_EMAIL_CONTENT(hr, totalRewardsCreated),
				},
				[
					{
						path: xlPath,
					},
					{
						path: pdfPath,
					},
				],
			);
			fs.unlink(xlPath, (err: any) => {
				if (err) {
					logger.error("Error deleting file:", err);
				}
			});
			fs.unlink(pdfPath, (err: any) => {
				if (err) {
					logger.error("Error deleting file:", err);
				}
			});
			// fs.unlink(protectedPdfPath, (err: any) => {
			// 	if (err) {
			// 		logger.error("Error deleting file:", err);
			// 	}
			// });
			logger.info("sent HR Email");
		}
	} else {
		logger.error(
			"HR's email address not found for rewards creation success mail",
		);
	}
};

/**
 * @description maps rewardDAOs to rewardDTOs
 * @param rewardDAOs
 * @returns rewardDTOs
 */
const mapRewardDaosToRewardDtos = async (
	rewardDAOs: Reward[],
): Promise<RewardDTO[]> => {
	const rewardDTOs: RewardDTO[] = [];
	for (const rewardDAO of rewardDAOs) {
		const rewardee: User | null = await UserModel.findOne({
			_id: rewardDAO.rewardee,
		}).exec();
		const rewarder: User | null = await UserModel.findOne({
			_id: rewardDAO.addedBy,
		}).exec();
		const rewardCategory: any = await RewardCategoriesModel.findOne({
			_id: rewardDAO.rewardCategory,
		}).exec();
		if (!rewardee) {
			continue;
		}
		const formattedRewardee: any = [
			rewardee.employeeId,
			HYPHEN,
			rewardee.name,
		].join(SPACE);
		const formattedRewarder: string | number = rewarder
			? [rewarder.employeeId, HYPHEN, rewarder.name].join(SPACE)
			: rewardDAO.addedBy;
		rewardDTOs.push({
			date: rewardDAO.createdAtVal,
			rewardee: formattedRewardee,
			rewardCategory: rewardCategory.name,
			description: rewardDAO.description,
			rewardPoints: rewardDAO.rewardPoints,
			addedBy: formattedRewarder,
		});
	}
	return rewardDTOs.filter((rewardDTO) => rewardDTO);
};

/**
 * @description gets and returns the rewards in a displayable format
 * @returns void
 */
export const getRewards: (req: Request, res: Response) => Promise<void> = async (
	req,
	res,
) => {
	try {
		const isPaginatedGenObject: Generator = checkPaginationAndRespond(req, res);
		const isValidPagination = isPaginatedGenObject.next().value;
		if (!isValidPagination) {
			isPaginatedGenObject.return(0);
			return;
		}
		const dateSortFactor = getDateSortingFactor(req);
		const rewards = await RewardModel.find({
			rewardee: { $ne: null },
			transactionId: { $ne: null },
		})
			?.populate("rewardCategory")
			?.sort(dateSortFactor);
		const formattedRewards = await mapRewardDaosToRewardDtos(rewards);
		isPaginatedGenObject.next(formattedRewards);
		logger.info("Successfully Fetched All Rewards");
	} catch (error: any) {
		logger.error("Fetch Rewards Failed:" + error?.message);
		throw new Error();
	}
};

/**
 * @description uses filters to return the filtered rewards
 * @params filters
 * @returns Reward[]
 */
const getFilteredRewards = async (
	filters: RewardFiltersDTO,
	req: Request,
): Promise<Reward[] | never> => {
	const rewardsQueryObject: any = {
		rewardee: { $ne: null },
		transactionId: { $ne: null },
	};
	// filtering rewardee
	if (filters.rewardee || filters.rewardee === 0) {
		const rewardee = await getUserByEmpId(filters.rewardee);
		if (!rewardee) {
			throw new Error(
				JSON.stringify({ rewardee: filterErrorMessages.INVALID_REWARDEE }),
			);
		}
		rewardsQueryObject.rewardee = rewardee._id;
	}
	// filtering rewarder
	if (filters.addedBy || filters.addedBy === 0) {
		const addedBy = await getUserByEmpId(filters.addedBy);
		if (!addedBy) {
			throw new Error(
				JSON.stringify({ addedBy: filterErrorMessages.INVALID_REWARDER }),
			);
		}
		rewardsQueryObject.addedBy = addedBy._id;
	}
	// filtering reward category
	if (filters.rewardCategory) {
		const rewardCategory = await RewardCategoriesModel.findOne({
			name: filters.rewardCategory,
		});
		if (!rewardCategory) {
			throw new Error(
				JSON.stringify({
					rewardCategory: filterErrorMessages.INVALID_REWARD_CATEGORY,
				}),
			);
		}
		rewardsQueryObject.rewardCategory = rewardCategory;
	}
	let dateRange: any = {};
	// filtering start date
	if (filters.startDate && !filters.endDate) {
		const startDate = new Date(moment(filters.startDate).format("YYYY-MM-DD"));
		const nextDate = new Date(startDate);
		nextDate.setDate(startDate.getDate() + 1);
		dateRange = { $gte: startDate, $lt: nextDate };
	} else {
		if (filters.startDate) {
			const startDate = new Date(
				moment(filters.startDate).format("YYYY-MM-DD"),
			);
			dateRange.$gte = startDate;
		}
		if (filters.endDate) {
			const endDate = new Date(moment(filters.endDate).format("YYYY-MM-DD"));
			const nextDate = new Date(endDate);
			nextDate.setDate(endDate.getDate() + 1);
			dateRange.$lt = nextDate;
		}
	}
	if (Object.keys(dateRange).length) {
		rewardsQueryObject.createdAt = dateRange;
	}
	const dateSortFactor = getDateSortingFactor(req);
	const rewards: Reward[] =
		await RewardModel.find(rewardsQueryObject)?.sort(dateSortFactor);
	return rewards;
};

/**
 * @description gets and sends the rewards in a displayable format
 * @params filters - rewardee, rewardCategory, addedBy, dateRange
 * @returns void
 */
export const sendFilteredRewards: (
	filters: any,
	res: Response,
) => Promise<void> = async (req, res) => {
	try {
		// validating the request body
		const { rewardee, rewardCategory, addedBy, startDate, endDate } = req.body;
		const errorMap = await classValidate(
			RewardFiltersDTO,
			rewardee,
			rewardCategory,
			addedBy,
			startDate,
			endDate,
		);
		if (Object.keys(errorMap).length) {
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				{ errorMap },
				res,
			);
			return;
		}
		const filters: RewardFiltersDTO = {
			rewardee,
			rewardCategory,
			addedBy,
			startDate,
			endDate,
		};

		// pagination check
		const isPaginatedGenObject: Generator = checkPaginationAndRespond(req, res);
		const isValidPagination = isPaginatedGenObject.next().value;
		if (!isValidPagination) {
			isPaginatedGenObject.return(0);
			return;
		}

		// filtration
		try {
			const rewards = await getFilteredRewards(filters, req);
			const formattedRewards = await mapRewardDaosToRewardDtos(rewards);
			// setting the response
			isPaginatedGenObject.next(formattedRewards);
			logger.info("Successfully Fetched All Rewards");
		} catch (e: any) {
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				e.message
					? {
							errorMap: JSON.parse(e.message),
					  }
					: { errorMap: {} },
				res,
			);
		}
	} catch (error: any) {
		logger.error("Fetch Rewards Failed:" + error?.message);
		throw new Error();
	}
};

/**
 * @description gets and returns the reward categories in a displayable format
 * @returns void
 */
export const getRewardCategories: (
	req: Request,
	res: Response,
) => Promise<void> = async (req, res) => {
	// getting the reward categories
	let savedRewardCategories: any = await RewardCategoriesModel.find().lean();
	savedRewardCategories = savedRewardCategories
		.map((rewardCategory: RewardCategories) => rewardCategory.name)
		.filter((rewardCategory: RewardCategories) => rewardCategory);
	logger.info("Successfully Fetched All Rewards Categories");
	// setting the response
	sendResponse(statusMessages.SUCCESS, statusCodes.OK, savedRewardCategories, res);
};

/**
 * @description Create Coupons End Points
 * @param req
 * @param res
 * @returns Response
 */
const generateCoupon: () => Promise<CouponDetails> = async () => {
	try {
		const couponCode = crypto.randomBytes(8).toString("hex"); // couponCode for the user & hr
		const secretCode = crypto.randomBytes(8).toString("hex"); // secretCode for the user
		const encryptedCouponCode = cryptTheCoupon(couponCode, secretCode);
		logger.info("Coupon Saved into DB");
		return { encryptedCouponCode, secretCode, couponCode };
	} catch (error: any) {
		logger.error("Create Coupons Failed : " + error.message);
		throw new Error();
	}
};

/**
 * @description Schedule CRON Jobs for deleting Coupons from DB
 * @param req
 * @param res
 * @returns Response
 */
export const scheduleExpirationJob: (req: Request, res: Response) => Promise<void> = async (
	req,
	res
) => {
	try {
		const employeeInfo: UserInfo = res.locals.employeeinfo;
		const { employeeId } = employeeInfo;

		const { date } = req.body;
		const expirationDate = new Date(moment(date).format("YYYY-MM-DD"));
		const currentDate = new Date();

		// If Expiration Date is set to a previous date, BAD_REQUEST response is sent
		if(expirationDate <  currentDate) {
			logger.error("Schedule Coupon Expiration : Expiration Date has to be set in future");
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				{ ...generateErrorResponseObj(scheduleExpirationMessages.PREVIOUS_DATES_NOT_ALLOWED) },
				res
			);
			return ;
		}
		
		// Checking if a Job is already in queue
		const JobCount = await JobSchema.countDocuments({});
		if(JobCount !== 0) {
			logger.error("Schedule Coupon Expiration : A Job is active alredy");
			sendResponse(
				statusMessages.ERROR,
				statusCodes.INTERNAL_SERVER_ERROR,
				{ ...generateErrorResponseObj(scheduleExpirationMessages.JOB_IS_ALREADY_IN_QUEUE) },
				res
			);
			return ;
		}
		
		await JobSchema.create({
			expirationDate,
			isActive: true,
			isCancelled: false,
			addedBy: employeeId
		});
		
		sendResponse(
			statusMessages.SUCCESS,
			statusCodes.CREATED,
			scheduleExpirationMessages.CRON_JOB_CREATED,
			res
		);
	} catch (error: any) {
		logger.error("Schedule Coupon Expiration : " + error.message);
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(scheduleExpirationMessages.CRON_JOB_SCHDEULING_FAILED) },
			res
		);
	}
};

/**
 * @description Cancels the existing CRON Job for deleting Coupons from DB
 * @param req
 * @param res
 * @returns Response
 */
export const cancelExpirationJob: (req: Request, res: Response) => Promise<void> = async (
	req,
	res
) => {
	try {
		// Checking if a Job is already in queue
		const JobCount = await JobSchema.countDocuments({});
		if(JobCount === 0) {
			logger.error("Cancel Coupon Expiration Job : No Jobs in Queue");
			sendResponse(
				statusMessages.NO_ITEM,
				statusCodes.NOT_FOUND,
				{ ...generateErrorResponseObj(scheduleExpirationMessages.NO_EXISTING_JOBS_IN_QUEUE) },
				res
			);
			return ;
		}

		const Job = await JobSchema.findOne({});
		// Existing Job is removed and its status is updated in the log
		const inCompleteJobId = Job.jobId;
		await JobSchema.deleteMany({});
		const JobLogs = await JobLogSchema.updateOne(
			{jobId: inCompleteJobId},
			{
				$set: { isActive: false, isCompleted: false, isCancelled: true }
			}
		);

		sendResponse(statusMessages.SUCCESS, statusCodes.OK, scheduleExpirationMessages.JOB_CANCELLED, res);
	} catch (error: any) {
		logger.error("Cancel Coupon Expiration Job : " + error.message);
		sendResponse(
			statusMessages.SERVER_ERROR,
			statusCodes.INTERNAL_SERVER_ERROR,
			{ ...generateErrorResponseObj(scheduleExpirationMessages.CANCELLING_JOB_FAILED) },
			res
		);
	}
};