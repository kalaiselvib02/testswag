import express, { type Request, type Response } from "express";
const userRouter = express.Router();
const { authenticateToken } = require("../middlewares/auth.middleware");
const { routesConstants } = require("../constants");
const {
	getProductsList,
	getUserPoints,
	placeOrder,
	productColors,
	productSizes,
	getUserRewards,
	getUserTransactions,
	cancelOrder,
	updateCart,
	getCart,
	deleteCart,
	getOrdersByEmployeeId,
	getCOItems,
	claimReward
} = require("../user/user.controller");

/**
 *  This endpoint is for getting product list details from the inventory
 */
userRouter.get(
	routesConstants.ORDERS,
	authenticateToken,
	(req: Request, res: Response) => {
		getOrdersByEmployeeId(req, res);
	},
);

/**
 *  This endpoint is for getting product list details from the inventory
 */
userRouter.get(
	routesConstants.USER_PRODUCTS,
	authenticateToken,
	(req: Request, res: Response) => {
		getProductsList(req, res);
	},
);

/**
 *  This route retrieves user points by employee id
 */
userRouter.get(
	routesConstants.USER_POINTS,
	authenticateToken,
	(req: Request, res: Response) => {
		getUserPoints(req, res);
	},
);

userRouter.post(
	routesConstants.ORDERS,
	authenticateToken,
	(req: Request, res: Response) => {
		placeOrder(req, res);
	},
);
/**
 *  This end point is defined for getting all the rewards of the user
 */
userRouter.get(
	routesConstants.USER_REWARDS,
	authenticateToken,
	(req: Request, res: Response) => {
		getUserRewards(req, res);
	},
);

/**
 *  This end point is defined for getting all the transactions of the user
 */
userRouter.get(
	routesConstants.USER_TRANSACTIONS,
	authenticateToken,
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	(req: Request, res: Response) => {
		getUserTransactions(req, res);
	},
);

/**
 *  This route retrieves user product colors
 */
userRouter.get(
	routesConstants.PRODUCT_COLORS,
	authenticateToken,
	(req: Request, res: Response) => {
		productColors(req, res);
	},
);

/**
 *  This route retrieves user product size
 */
userRouter.get(
	routesConstants.PRODUCT_SIZE,
	authenticateToken,
	(req: Request, res: Response) => {
		productSizes(req, res);
	},
);

/**
 *  This route cancels user order
 */
userRouter.patch(
	routesConstants.USER_CANCEL_ORDER,
	authenticateToken,
	(req: Request, res: Response) => {
		cancelOrder(req, res);
	},
);
/**
 *  This route puts items in cart
 */
userRouter.post(routesConstants.USER_UPDATE_CART, authenticateToken, updateCart);
userRouter.get(routesConstants.USER_GET_CART, authenticateToken, getCart);

/**
 *  This route cancels user order
 */
userRouter.delete(
	routesConstants.USER_REMOVE_CART_ITEM,
	authenticateToken,
	(req: Request, res: Response) => {
		deleteCart(req, res);
	},
);


/**
 *  This route cancels user order
 */
 userRouter.post(
	routesConstants.CLAIM_REWARD,
	authenticateToken,
	(req: Request, res: Response) => {
		claimReward(req, res);
	},
);

/**
 *  This route gets items that is being checkout for rendering
 */
userRouter.get(routesConstants.CHECKOUT, authenticateToken, getCOItems);

module.exports = userRouter;
