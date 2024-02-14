import { type Response, type Request } from "express";
import { validatePageLimit } from "./validation.helpers";
import {
	COMPUTED_SORTING_ATTRS,
	IDEAL_DATE_FORMAT,
	MONGO_CONSTANTS,
	SIGN_ARR,
	statusCodes,
	statusMessages,
} from "../constants";
import { logger } from "../logger/logger";
import moment from "moment";

const { sendResponse } = require("../helpers/json.helper");
const { generateErrorResponseObj } = require("../helpers/common.helpers");
const sortArray = require("sort-array");

const INVALID_FACTOR = "Invalid sorting request";

/**
 *  Returns array of paginated result
 * @param {Number} page
 * @param {Number} limit
 * @param {Array} data
 * @returns {Array}
 */
export const pagination = (offset: number, limit: number, data: any) => {
	const startIndex = offset * limit;
	const endIndex = (offset + 1) * limit;
	const paginatedResult = data.slice(startIndex, endIndex);
	return paginatedResult;
};
/**
 * This function checks the query params for pagination. If present and valid returns offset and limit. If not present returns null. If invalid returns false.
 * @param {Request} req
 * @returns {Boolean || null}
 */
export const checkPaginationParams = (req: Request) => {
	if (req.query.offset && req.query.limit) {
		const offsetQueryParam: any = req.query.offset;
		const limitQueryParam: any = req.query.limit;
		const offset = parseInt(offsetQueryParam);
		const limit = parseInt(limitQueryParam);
		const isValid = validatePageLimit(offset, limit);
		if (isValid) {
			return { offset, limit };
		} else {
			return false;
		}
	} else {
		return null;
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sortRecordsBasedOnRequest = (req: Request, records: any[]): any[] | never => {
	const sortFactors: string[] = Object.keys(req.query).filter((key) =>
		key.startsWith("sort_"),
	);
	if (!records?.length || !sortFactors?.length) {
		return records;
	}

	let sortFactor: string = sortFactors[0];
	let orderFactor: string | undefined = req.query[sortFactor]?.toString();
	if (typeof orderFactor !== "string") {
		throw new Error(INVALID_FACTOR);
	}
	orderFactor = orderFactor.toLowerCase();
	sortFactor = sortFactor.replace("sort_", "");
	if (
		!Object.keys(records[0]).includes(sortFactor) ||
		!["desc", "asc"].includes(orderFactor)
	) {
		throw new Error(INVALID_FACTOR);
	}

	const zeroethSortingAttr = records[0][sortFactor];

	// if the date is in the ideal format
	if (!moment(zeroethSortingAttr, IDEAL_DATE_FORMAT, true).isValid()) {
		if (
			typeof zeroethSortingAttr === "string" &&
			SIGN_ARR.includes(zeroethSortingAttr?.[0]) &&
			isFinite(Number(zeroethSortingAttr))
		) {
			// singed number comparison
			records = sortArray(records, {
				by: COMPUTED_SORTING_ATTRS.SIGNED_AMOUNT,
				order: orderFactor,
				computed: {
					signedAmount: (record: any) => Number(record[sortFactor]),
				},
			});
		} else {
			// Normal primitive comparison
			records = sortArray(records, {
				by: sortFactor,
				order: orderFactor,
			});
		}
	}

	return records;
};

/**
 * Pagination gen function that takes in a req, res as param
 * @param Request
 * @param Response
 * @generatorParam any[]
 * @returns bool (to decide to return or continue)
 * @returns value
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function* checkPaginationAndRespond(req: Request, res: Response) {
	try {
		const isPaginated: Record<string, number> | false | null =
			checkPaginationParams(req);
		if (isPaginated === false) {
			sendResponse(
				statusMessages.BAD_REQUEST,
				statusCodes.BAD_REQUEST,
				statusMessages.PAGINATION_ERROR,
				res,
			);
		}
		// eslint-disable-next-line prettier/prettier, @typescript-eslint/no-explicit-any
		let records: any[] = yield isPaginated !== false;
		if (records) {
			records = sortRecordsBasedOnRequest(req, records);
		}
		// if (listToPaginate.length)
		if (isPaginated) {
			const { offset, limit } = isPaginated;
			const paginatedResult = pagination(offset, limit, records);
			const count = records.length;
			const resultData = {
				result: paginatedResult,
				count,
			};
			sendResponse(statusMessages.SUCCESS, statusCodes.OK, resultData, res);
		} else {
			sendResponse(
				statusMessages.SUCCESS,
				statusCodes.OK,
				{ result: records, count: records.length },
				res,
			);
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		logger.error(e.message);
		sendResponse(
			statusMessages.ERROR,
			statusCodes.BAD_REQUEST,
			{ ...generateErrorResponseObj(statusMessages.BAD_REQUEST) },
			res,
		);
	}
}

/**
 * @description get date sorting factor which defaults to descending
 * @param req - request object
 * @returns string - createdAt(asc) or -createdAt(desc)
 */
export const getDateSortingFactor = (req: Request): string => {
	const requestedSortFactor = req.query?.sort_date;
	const dateSortFactor =
		requestedSortFactor === "asc"
			? MONGO_CONSTANTS.COMMONS.CREATED_AT
			: MONGO_CONSTANTS.COMMONS.CREATED_AT_DASH;
	return dateSortFactor;
};
