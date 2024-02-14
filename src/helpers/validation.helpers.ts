const { getUserByEmpId } = require("./db.helpers");
const { toUpperCaseArrayOfString } = require("./common.helpers");
const {
	locationConstants,
	dbOrderStatus,
	orderFilterErrorMessages,
} = require("../constants");
/**
 * This function validates the offset and limit for pagination.
 * @param {number} offset
 * @param {number} limit
 * @returns {Boolean}
 */
export const validatePageLimit = (offset: number, limit: number) => {
	if (isNaN(offset) || isNaN(limit) || offset < 0 || limit <= 0) {
		return false;
	}
	return true;
};

/**
 * Validate employee id.
 * @param {number} employeeId
 * @returns {boolean}
 */
export const validateEmployeeId = async (employeeId: number) => {
	let user;
	if (isNaN(employeeId)) {
		return false;
	} else {
		user = await getUserByEmpId(employeeId);
		if (!user) {
			return false;
		}
	}
	return user;
};

/**
 * Compare and check whether the received values have are expected.
 * @param expectedValues
 * @param requestedValues
 * @returns {boolean}
 */
export const checkValuesInArray = (
	expectedValues: string[],
	requestedValues: string[],
) => {
	const formattedExpectedArray = toUpperCaseArrayOfString(expectedValues);
	const formattedRequestedArray = toUpperCaseArrayOfString(requestedValues);
	for (const value of formattedRequestedArray) {
		if (!formattedExpectedArray.includes(value)) {
			return false;
		}
	}
	return true;
};

export const validateOrderFilters = async (
	employeeId: number,
	statusArray: string[],
	locationArray: string[],
) => {
	const isValidEmployee = employeeId
		? await validateEmployeeId(employeeId)
		: employeeId !== null;

	const isValidStatuses = statusArray
		? checkValuesInArray(Object.values(dbOrderStatus), statusArray)
		: statusArray !== null;
	const isValidLocations = locationArray
		? checkValuesInArray(Object.values(locationConstants), locationArray)
		: locationArray !== null;
	if (!isValidEmployee || !isValidStatuses || !isValidLocations) {
		const responseMessage: any = {};
		if (!isValidEmployee) {
			responseMessage.employeeId =
				orderFilterErrorMessages.INVALID_EMPLOYEE_ID;
		}
		if (!isValidStatuses) {
			responseMessage.status = orderFilterErrorMessages.INVALID_STATUS;
		}
		if (!isValidLocations) {
			responseMessage.location = orderFilterErrorMessages.INVALID_LOCATION;
		}
		return responseMessage;
	}
	return true;
};
