import express, { type Request, type Response } from "express";
import { routesConstants } from "../constants";
const { getEmployees } = require("../controllers/employees.controller");
const router = express.Router();
const { authenticateToken } = require("../middlewares/auth.middleware");

/**
 *  This end point is defined to get all employees from wallet.
 * @param {Request} req
 * @param {Response} res
 */
router.get(
	routesConstants.ROOT,
	authenticateToken,
	(req: Request, res: Response) => {
		getEmployees(req, res);
	},
);
module.exports = router;
