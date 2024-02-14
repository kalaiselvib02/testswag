export const APP_CONSTANTS = {
	INVENTORY: "INVENTORY",
	PRODUCTS: "PRODUCTS",
	NO_FILE: "NO_FILE",
	EMPTY: "EMPTY",
	NOT_FOUND: "NOT_FOUND",
	BAD_DATA: "BAD_DATA",
	SUCCESS: "SUCCESS",
	REQUIRED: "REQUIRED",
	CREATE: "CREATE",
	PARTIAL_CREATE: "PARTIAL_CREATE",
	UPDATE: "UPDATE",
	DELETE: "DELETE",
	CONFLICT: "CONFLICT",
	AUTH: "AUTH",
	ERROR: "ERROR",
	FORBIDDEN: "FORBIDDEN",
	UNAUTHORIZED: "UNAUTHORIZED",
	FILE_NAME: "fileName",
	NO_DATA: "NO DATA",
	OBJECT_FAILED: "Object Failed",
	EMPTY_EXCEL_SHEET: "Empty Excel Sheet",
	ERROR_IN_REQUEST_BODY: "Error in request body",
	NO_FILE_IN_REQUEST_BODY: "No File in Request Body",
	REFUND_ORDER_NO: "Refund Order No: ",
};

export const MONGO_CONSTANTS = {
	COMMONS: {
		_ID: "_id",
		CREATED_AT_DASH: "-createdAt",
		CREATED_AT: "createdAt",
		DESCRIPTION: "description",
	},
	COLLECTIONS: {
		PRODUCTS: "products",
		USERS: "users",
		ORDERS: "orders",
		POINTS: "points",
		REWARDS: "rewards",
		ROLES: "roles",
		TRANSACTIONS: "transactions",
		ORDER_HISTORIES: "orderhistories",
		ORDER_STATUSES: "orderstatuses",
		REWARD_CATEGORIES: "rewardcategories",
		LOCATION: "locations",
	},
	PRODUCTS: {
		PRODUCT_ID: "productId",
		TITLE: "title",
		REWARD_POINTS: "rewardPoints",
		IS_CUSTOMISABLE: "isCustomisable",
		PRODUCT_IMG_URL: "productImgURL",
	},
	USERS: {
		EMPLOYEE_ID: "employeeId",
		NAME: "name",
		EMAIL: "email",
		ROLE: "role",
	},
	ORDERS: {
		ORDER_ID: "orderId",
		EMPLOYEE_ID: "employeeId",
		PRODUCT_ID: "productId",
		QUANTITY: "quantity",
		STATUS_ID: "statusId",
	},
	REWARDS: {
		TRANSACTION_ID: "transactionId",
		ADDED_BY: "addedBy",
		REWARDEE: "rewardee",
		REWARD_CATEGORY: "rewardCategory",
		REWARD_POINTS: "rewardPoints",
	},
	ORDER_HISTORIES: {
		ORDER_ID: "orderId",
		STATUS: "status",
		HISTORY: "history",
	},
	ORDER_STATUSES: {
		STATUS: "status",
		NAME: "name",
		ORDER_HISTORY_STATUS: "orderHistory.status",
	},
	POINTS: {
		TOTAL: "total",
		REDEEMED: "redeemed",
		AVAILABLE: "available",
	},
	TRANSACTIONS: {
		IS_CREDITED: "isCredited",
	},
	LOCATIONS: {
		NAME: "name",
	},
	AS: {
		PRODUCT_DETAILS: "productDetails",
		USER_DETAILS: "userDetails",
		USER_DETAILS_LOCATION: "userDetails.location",
		CURRENT_STATUS: "currentStatus",
		ORDER_HISTORY: "orderHistory",
		EMPLOYEE_DETAILS: "employeeDetails",
		USER_LOCATION: "userLocation",
		USER_LOCATION_NAME: "userLocation.name",
		CURRENT_STATUS_NAME: "currentStatus.name",
		ORDER_DETAILS: "orderDetails",
		TRANSACTION_DETAILS: "transactionDetails",
		TRANSACTION_DETAILS_TRANSACTION_ID: "transactionDetails.transactionId",
	},
	UNWIND: {
		ORDER_HISTORY: "$orderHistory",
		CURRENT_STATUS: "$currentStatus",
	},
};

// query helper constants
const dollarSign = "$";
export const ORDER_HISTORY_STATUS = "orderHistory.status";
export const getDollarSigned = (val: string): string => dollarSign + val;

// Pagination helper constants
export const SIGN_ARR = ["+", "-"];
export const IDEAL_DATE_FORMAT = "DD MMM YYYY";
export const COMPUTED_SORTING_ATTRS = {
	MOMENT_DATE: "momentDate",
	SIGNED_AMOUNT: "signedAmount",
};
