import express, { type Request, type Response } from "express";
import multer from "multer";
import { roleConstants, routesConstants } from "../constants";
import {
	bulkCreateRewards,
	bulkUploadRewards,
	getAllRewards,
	getAllRewardCategories,
	getAllFilteredRewards,
	scheduleExpiration,
	cancelExpiration,
} from "../hr/hr.controller";

const upload = multer({ dest: "./uploads/" });
const { authenticateToken, authorize } = require("../middlewares/auth.middleware");
const rewardsRouter = express.Router();

/**
 *  This end point is defined for validating the uploaded xlsx - HR
 */
rewardsRouter.post(
	routesConstants.UPLOAD,
	authenticateToken,
	authorize(roleConstants.HR),
	upload.single("rewardsFile"),
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async (req: Request, res: Response) => {
		await bulkUploadRewards(req, res);
	},
);
/**
 *  This end point is defined for saving the rewards - HR
 */
rewardsRouter.post(
	routesConstants.USER_REWARDS,
	authenticateToken,
	authorize(roleConstants.HR),
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async (req: Request, res: Response) => {
		await bulkCreateRewards(req, res);
	},
);
/**
 *  This end point is defined for getting all the rewards - HR
 */
rewardsRouter.get(
	routesConstants.USER_REWARDS,
	authenticateToken,
	authorize(roleConstants.HR),
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async (req: Request, res: Response) => {
		await getAllRewards(req, res);
	},
);

/**
 *  This end point is defined for getting the filtered rewards - HR
 */
rewardsRouter.post(
	routesConstants.REWARD_FILTER,
	authenticateToken,
	authorize(roleConstants.HR),
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async (req: Request, res: Response) => {
		await getAllFilteredRewards(req, res);
	},
);

/**
 *  This end point is defined for getting all the reward categories - HR
 */
// eslint-disable-next-line @typescript-eslint/no-misused-promises
rewardsRouter.get(
	routesConstants.REWARD_CATEGORIES,
	authenticateToken,
	authorize(roleConstants.HR),
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async (req: Request, res: Response) => {
		await getAllRewardCategories(req, res);
	},
);

/**
 *  This end point is for scheduling Expiration Job
 */
rewardsRouter.post(
	routesConstants.SCHEDULE_EXPIRATION,
	authenticateToken,
	authorize(roleConstants.HR),
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async (req: Request, res: Response) => {
		await scheduleExpiration(req, res);
	},
);

/**
 *  This end point is for cancelling Expiration Job
 */
rewardsRouter.delete(
	routesConstants.SCHEDULE_EXPIRATION,
	authenticateToken,
	authorize(roleConstants.HR),
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	async (req: Request, res: Response) => {
		await cancelExpiration(req, res);
	},
);

module.exports = rewardsRouter;
