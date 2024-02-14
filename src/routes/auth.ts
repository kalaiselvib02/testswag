import express, { type Request, type Response } from "express";
const { loginUser, resetPassword } = require("../controllers/auth.controller");
const router = express.Router();
const { routesConstants } = require("../constants");

/**
 *  This end point is defined for user login
 * @param {Request} req
 * @param {Response} res
 */
router.post(routesConstants.LOGIN, (req: Request, res: Response) => {
	loginUser(req, res);
});

/**
 *  This end point is defined for user reset password
 * @param {Request} req
 * @param {Response} res
 */
router.post(routesConstants.RESET_PASSWORD, (req: Request, res: Response) => {
	resetPassword(req, res);
});

module.exports = router;
