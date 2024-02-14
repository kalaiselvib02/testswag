import { type Request, type Response } from "express";
const { getAllEmployees } = require("../services/employees.services");


/**
 *  This controller helps in fetching all employees from wallet
 * @param {Request} req
 * @param {Response} res
 */
exports.getEmployees = async (req: Request, res: Response) => {
	getAllEmployees(req, res);
};
