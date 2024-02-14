import { type Response } from "express";
const axios = require("axios");
const { authentication } = require("../constants/authentication.constants");

// Function to fetch api data.
exports.fetchApiData = async (url: string, payload: object) => {
	return await new Promise(function (resolve, reject) {
		axios
			.post(url, payload)
			.then(function (response: Response) {
				resolve(response);
			})
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.catch(function (error: any) {
				reject(error.response);
			});
	});
};

/**
 * Function to post data.
 * @param {string} url
 * @param {object} payload
 */
exports.postApiData = (url: string, payload: object) => {
	return new Promise(function (resolve, reject) {
		axios
			.post(url, payload)
			.then(function (response: Response) {
				resolve(response);
			})
			.catch(function (error: any) {
				reject(error.response);
			});
	});
};

/**
 * Function to get api data.
 * @param {String} url
 * @param {Object} payload
 */
exports.getApiData = (url: string, token: string) => {
	return new Promise(function (resolve, reject) {
		axios
			.get(url, {
				headers: {
					Authorization: `${authentication.BEARER} ${token}`,
				},
			})
			.then(function (response: Response) {
				resolve(response);
			})
			.catch(function (error: any) {
				reject(error.response);
			});
	});
};
