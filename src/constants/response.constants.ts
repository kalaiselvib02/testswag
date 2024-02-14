export const statusMessages = {
	SUCCESS: "SUCCESS",
	EMPTY_REQUEST: "Empty Request Received",
	ERROR: "ERROR",
	INVALID_USER: "Invalid user",
	SERVER_ERROR: "Internal Server error",
	PARTIAL_SUCCESS: "Partial success",
	INVALID_CREDENTIALS: "Invalid Credentials",
	UNAUTHORIZED: "Access Denied",
	BAD_REQUEST: "Bad Request",
	NO_ITEM: "Item not found",
	CUSTOMISATION_ERROR: "Customisation Error",
	CUSTOMISATION_NOT_ALLOWED: "Customisation is not allowed",
	PAGINATION_ERROR: "Invalid offset or limit",
	INVALID_EXPIRED_COUPON : "Invalid or Expired Coupon"
};

export const statusCodes = {
	OK: 200,
	CREATED: 201,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
	MULTI_STATUS: 207,
};

export const orderFilterErrorMessages = {
	INVALID_EMPLOYEE_ID: "Invalid Employee id",
	INVALID_STATUS: "Invalid Status",
	INVALID_LOCATION: "Invalid Location",
	FILTER_REQUIRED: "Atleast one filter is required",
};

export const cancelOrderErrorMessages = {
	ORDER_NOT_FOUND: "Order not found",
	INVALID_STATUS: "Invalid Status",
	CANCEL_ERROR: "Cannot cancel order",
};

export const cartMessages = {
	ITEM_NOT_FOUND: "Cart item not found",
	ITEM_REMOVED: "Successfully removed product from cart",
};

export const scheduleExpirationMessages = {
	PREVIOUS_DATES_NOT_ALLOWED: "Previous Dates are Not Allowed",
	JOB_IS_ALREADY_IN_QUEUE: "A Job is already in Queue",
	CRON_JOB_CREATED: "CRON Job Created Successfully",
	CRON_JOB_SCHDEULING_FAILED: "Cron Job Scheduling Failed",
	NO_EXISTING_JOBS_IN_QUEUE: "No Existing Jobs in the Queue",
	JOB_CANCELLED: "Existing Job has been Cancelled",
	CANCELLING_JOB_FAILED: "Cancelling CRON Job has Failed",
};