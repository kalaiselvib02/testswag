import { type ValidationError, validate } from "class-validator";
import { roleConstants, orderStatusInDashboard } from "../constants";
import { type PayloadValidation } from "../types/error.type";
import {
	getUserRoleId,
	getOrderStatusCount,
	getStatusId,
	getUserLocationId,
	getObjByField,
} from "./db.helpers";
import { Product } from "../models/products.model";
/**
 * Add user role
 * @param {any} userArray
 * @returns {Array<Object>}
 */
const addRole = async (userArray: any) => {
	const userModifiedArr: Object[] = [];
	for (let i = 0; i < userArray.length; i++) {
		userArray[i].role = await getUserRoleId(roleConstants.USER);
		userArray[i].location = await getUserLocationId(userArray[i].location);
		userModifiedArr.push(userArray[i]);
	}
	return userModifiedArr;
};

/**
 * Get all order status count for admin dashboard
 * @returns {object}
 */
const getAllOrderStatusCount = async () => {
	const orderStatusCount: any = {};
	for (const key in orderStatusInDashboard) {
		if (orderStatusInDashboard.hasOwnProperty(key)) {
			const status = orderStatusInDashboard[key];
			const statusId = await getStatusId(status);
			const count = await getOrderStatusCount(statusId);
			orderStatusCount[key.toLowerCase()] = count;
		}
	}
	return orderStatusCount;
};

/**
 * @description Takes an string/int parameter and if string, parses the string to int
 * @param value
 * @returns Integer
 */
const parseIntegerValue = (value: string | number): number => {
	return typeof value === "string" ? parseInt(value.trim()) : value;
};

/**
 * @description validates the given data based on the given dto
 * @param data
 * @param dto
 * @returns boolean if validation successful or not
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const classValidate = async (Dto: any, ...dataToBeValidated: any): Promise<any> => {
	const data = new Dto(...dataToBeValidated);
	const errors: ValidationError[] = await validate(data);
	if (errors?.length > 0) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, array-callback-return
		const keyErrorMap = errors.reduce((acc: any, error: ValidationError) => {
			if (error.constraints) {
				acc[error.property] = Object.values(error.constraints).join(", ");
				return acc;
			}
		}, {});
		return keyErrorMap;
	}
	return {};
};

/**
 * This function retrieves a field from the array of objects and returns array of field.
 * @param {Array<object>} objects
 * @param {string} field
 * @returns {Array<any>}
 */
const getFieldFromArrayOfObjects = async (
	objects: Array<Record<string, any>>,
	field: string,
): Promise<any[]> => {
	const fieldArray: any[] = [];
	for (const object of objects) {
		fieldArray.push(object[field]);
	}
	return fieldArray;
};

/**
 * purpose : to get flattened error contraints from the error object
 * @param errors
 * @returns
 */
const getErrorConstraints = (errors: any) => {
	const flattenedErrors: any = [];
	errors.forEach((error: ValidationError) => {
		const message: any = [...Object.values(error.constraints || {})];

		if (message != "") {
			flattenedErrors.push({
				message,
				...{ name: error.property, value: error.value },
			});
		}
		if (error.children && error.children.length > 0) {
			flattenedErrors.push(...getErrorConstraints(error.children));
		}
	});
	return flattenedErrors;
};
/**
 * purpose : to format and send payload validations
 * @param errors
 * @returns
 */
const classValidationErrorMessages = (
	errors: ValidationError[],
): Array<PayloadValidation> => {
	let errorObject: Array<PayloadValidation> = [];
	errors.forEach((error) => {
		if (error.children && error.children.length > 0) {
			error.children.forEach((err: ValidationError) => {
				const payloadErrorObj: PayloadValidation = {
					entity: err.value,
					errors: getErrorConstraints(err.children),
				};
				errorObject.push(payloadErrorObj);
			});
		}
	});
	return errorObject;
};
/**
 * This function get array of strings and converts to uppercase.
 * @param {Array<string>} strings
 * @returns {Array<string>}
 */
const toUpperCaseArrayOfString = (strings: string[]) => {
	const formattedArray = [];
	for (const item of strings) {
		formattedArray.push(item.toUpperCase());
	}
	return formattedArray;
};

/**
 * Returns array of object ids.
 * @param schema
 * @param fieldName
 * @param objectArray
 * @returns {Array<string>}
 */
const getIdsFromArray = async (
	schema: any,
	fieldName: string[],
	objectArray: string[],
) => {
	const objectIdArray = [];
	for (const item of objectArray) {
		const obj = await getObjByField({ [fieldName[0]]: item }, schema);
		objectIdArray.push(obj._id?.toString());
	}
	return objectIdArray;
};
/**
 * purpose : to generate common error object to send in response
 * @param message
 * @returns
 */
const generateErrorResponseObj = (message: string) => {
	return {
		error: {
			isSuccess: false,
			message: message,
		},
	};
};

/**
 * purpose : to generate response object for Inventory Upload End Point
 * @param {Product} newProduct
 * @param {boolean} isErroneousValue
 * @returns object
 */
const generateProductUploadResponseObj = (
	newProduct: Product,
	isErroneousValue: boolean,
) => {
	return {
		title: newProduct.title !== undefined ? newProduct.title.replace(/\s+/g, ' ').trim() : "",
		rewardPoints:
			newProduct.rewardPoints !== undefined ? newProduct.rewardPoints : -1,
		isCustomisable: newProduct.isCustomisable?.toString().toUpperCase(),
		productImgURL:
			newProduct.productImgURL !== undefined ? newProduct.productImgURL : "",
		createdAt: newProduct.createdAt,
		isErroneous: isErroneousValue,
	};
};

module.exports = {
	addRole,
	getAllOrderStatusCount,
	parseIntegerValue,
	classValidate,
	getFieldFromArrayOfObjects,
	classValidationErrorMessages,
	toUpperCaseArrayOfString,
	getIdsFromArray,
	generateErrorResponseObj,
	generateProductUploadResponseObj
};
