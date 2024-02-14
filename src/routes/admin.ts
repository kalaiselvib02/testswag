import express, { type Request, type Response } from "express";
import multer from "multer";
import { roleConstants, routesConstants } from "../constants";
import { APP_CONSTANTS } from "../constants/constants";
import { logger } from "../logger/logger";
const upload = multer({ dest: "./public/uploads/" });
const {
	getProductsList,
	bulkCreateProducts,
	getOrderStatusCount,
	changeOrderStatus,
	getFilteredOrders,
	getOrdersList,
	createProduct,
} = require("../admin/admin.controller");
const adminRouter = express.Router();
const { authenticateToken, authorize } = require("../middlewares/auth.middleware");

/**
 *  This endpoint is for getting product list details from the inventory
 */
adminRouter.get(
	routesConstants.INVENTORY,
	authenticateToken,
	authorize(roleConstants.ADMIN),
	(req: Request, res: Response) => {
		try {
			getProductsList(req, res);
		} catch (error) {
			logger.error("Server Error - ",error);
			// serverErrorResponse()
		}
	},
);

/**
 *  This endpoint is for uploading product inventory through a excel file
 */
adminRouter
	.route(routesConstants.INVENTORY_UPLOAD)
	.post(
		upload.single(APP_CONSTANTS.FILE_NAME),
		authenticateToken,
		authorize(roleConstants.ADMIN),
		(req: Request, res: Response) => {
			try {
				bulkCreateProducts(req, res);
			} catch (error) {
				logger.error("Server Error-",error);
				// serverErrorResponse()
			}
		},
	);

/**
 *  This endpoint is for changing the order status
 */
adminRouter.patch(
	routesConstants.UPDATE_ORDER_STATUS,
	authenticateToken,
	authorize(roleConstants.ADMIN),
	(req: Request, res: Response) => {
		changeOrderStatus(req, res);
	},
);

/**
 *  This endpoint is for getting the all order status
 */
adminRouter.get(
	routesConstants.ADMIN_DASHBOARD,
	authenticateToken,
	authorize(roleConstants.ADMIN),
	(req: Request, res: Response) => {
		getOrderStatusCount(req, res);
	},
);

/**
 *  This endpoint is for filtering orders
 */
adminRouter.post(
	routesConstants.ORDERS,
	authenticateToken,
	authorize(roleConstants.ADMIN),
	(req: Request, res: Response) => {
		getFilteredOrders(req, res);
	},
);

/**
 *  This endpoint is for getting all orders
 */
adminRouter.get(
	routesConstants.ORDERS,
	authenticateToken,
	authorize(roleConstants.ADMIN),
	(req: Request, res: Response) => {
		getOrdersList(req, res);
	},
);

/**
 *  This endpoint is for adding a single product
 */
adminRouter.post(
	routesConstants.INVENTORY,
	authenticateToken,
	authorize(roleConstants.ADMIN),
	(req: Request, res: Response) => {
		createProduct(req, res);
	},
);

module.exports = adminRouter;
