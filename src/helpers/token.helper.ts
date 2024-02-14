import { UserInfo } from "../types/user.type";
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { authentication } = require("../constants/authentication.constants");
// Generates json web token
const tokenGenerator = (userDetails: UserInfo) => {
	const { employeeId, name, role, location } = userDetails;
	const token = jwt.sign(
		{ employeeId, name, role, location },
		process.env.ACCESS_TOKEN,
		{
			expiresIn: authentication.TOKEN_VALIDITY,
		},
	);
	return token;
};

// Validated token
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tokenValidator = (token: string): any => {
	try {
		const result = jwt.verify(token, process.env.ACCESS_TOKEN);
		return result;
	} catch (err) {
		return null;
	}
};

const tokenDecode = (token: string) => {
	try {
		const decodedToken = jwt.decode(token);
		return decodedToken;
	} catch (err) {
		return null;
	}
};

const walletEncodedToken = () => {
	const secretKey: any = process.env.WALLET_AUTH_SECRET_KEY;
	return Buffer.from(secretKey).toString(authentication.SECRET_KEY_BASE);
};

/**
 * This function retrieves bearer token from request and return token
 * @param {any} header
 * @returns {String}
 */
const getTokenFromHeader = (headers: any) => {
	const bearerHeader = headers[authentication.AUTHORIZATION_HEADER];
	// Check for token in authorization header
	if (typeof bearerHeader !== "undefined") {
		const bearer = (bearerHeader as string).split(" ");
		const bearerToken = bearer[1];
		return bearerToken;
	}
};

module.exports = {
	tokenGenerator,
	tokenValidator,
	tokenDecode,
	walletEncodedToken,
	getTokenFromHeader,
};
