import fs from "fs";
import path from "path";
import {
	COUPON_INPUT_DIR,
	COUPON_INPUT_FILE,
	COUPON_MERGED_PDF,
	COUPON_OUTPUT_DIR,
	COUPON_PDF,
} from "../constants/helper.constants";
import { logger } from "../logger/logger";
import { PDFMerger } from "./pdf-merger-js/index";
import ejs from "ejs";
import { type Reward } from "../types/rewards.type";
import { type User } from "../schemas/user.schema";
import { SPACE, UNDERSCORE } from "../constants/common.constants";
const htmlPdfNode = require("html-pdf-node");
const Recipe = require("muhammara").Recipe;

function capitalizeFirstLetter(str: string | null): string | null {
	return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

const renderFileAsync: (file: string, data: object) => Promise<string> = async (
	file,
	data,
) => {
	return await new Promise((resolve, reject) => {
		ejs.renderFile(file, data, (err, str) => {
			if (err) {
				reject(err);
			} else {
				resolve(str);
			}
		});
	});
};

export const passwordProtectPDF = (
	pdfPath: string | null,
	user: User,
	isHr: boolean,
): string | null => {
	const protectedPdfPath = path.join(
		__dirname,
		COUPON_OUTPUT_DIR,
		isHr ? COUPON_MERGED_PDF() : COUPON_PDF(),
	);
	let pdfDoc;
	if (pdfPath && user) {
		pdfDoc = new Recipe(pdfPath, protectedPdfPath);
		const password =
			user.employeeId +
			UNDERSCORE +
			capitalizeFirstLetter(user.name.split(SPACE)?.[0]);
		pdfDoc
			.encrypt({
				userPassword: password,
				ownerPassword: null,
				userProtectionFlag: parseInt("111000010100", 2),
			})
			.endPDF();
	}
	return pdfDoc ? protectedPdfPath : pdfPath;
};

const checkPathOrCreate = (outpuDirPath: string): void => {
	if (!fs.existsSync(outpuDirPath)) {
		fs.mkdirSync(outpuDirPath, { recursive: true });
	}
};

/**
 * @description takes a JSON data and converts the data in it to a new worksheet
 * @param multerFile: Express.Multer.File
 * @returns outputPath — : string | null
 */
export const createPDFWithData = async (
	reward1: Reward,
	reward2: Reward | null = null,
): Promise<string | null> => {
	try {
		const outpuDirPath = path.join(__dirname, COUPON_OUTPUT_DIR);
		checkPathOrCreate(outpuDirPath);
		logger.info("After getting/creating the uploads folder path");
		logger.info(
			"Rewards received in createPDFWithData: " +
				JSON.stringify(reward1) +
				JSON.stringify(reward2),
		);
		const outputPath = path.join(outpuDirPath, COUPON_PDF());
		// creating the pdf
		const rewards: Reward[] =
			reward1 && reward2 ? [reward1, reward2] : reward1 ? [reward1] : [];
		const inputPath = path.join(__dirname, COUPON_INPUT_DIR, COUPON_INPUT_FILE);
		const html = await renderFileAsync(inputPath, { rewards });
		const pdfBuffer: Buffer = await htmlPdfNode.generatePdf(
			{
				content: html,
			},
			{ format: "" },
		);
		fs.writeFileSync(outputPath, pdfBuffer);

		logger.info("PDF created");
		return outputPath;
	} catch (e: any) {
		logger.info(
			"PDF could not be created due to the error: " + JSON.stringify(e?.message),
		);
		return null;
	}
};

export const createMultiPagePDFwithData = async (
	rewards: Reward[],
): Promise<string | null> => {
	try {
		const pdfPaths: string[] = [];
		logger.info(
			"Rewards in createMultiPagePDFwithData-pdf.helper:" +
				JSON.stringify(rewards),
		);
		for (let i = 0; i < rewards.length; i += 2) {
			let pdfPath;
			rewards[i].isHRContext = true;
			if (rewards?.[i + 1]) {
				rewards[i + 1].isHRContext = true;
				pdfPath = await createPDFWithData(rewards[i], rewards[i + 1]);
			} else {
				pdfPath = await createPDFWithData(rewards[i]);
			}
			if (pdfPath) {
				pdfPaths.push(pdfPath);
			}
		}
		const merger = new PDFMerger();

		for (const pdf of pdfPaths) {
			await merger.add(pdf);
			logger.info("merger pdf" + JSON.stringify(pdf));
			fs.unlink(pdf, (err: any) => {
				if (err) {
					logger.error("Error deleting file:" + JSON.stringify(err));
				}
			});
		}

		await merger.setMetadata({
			producer: "HR CouponCodes PDF",
		});
		const outpuDirPath = path.join(__dirname, COUPON_OUTPUT_DIR);
		checkPathOrCreate(outpuDirPath);
		const outputPath = path.join(outpuDirPath, COUPON_MERGED_PDF());
		await merger.save(outputPath);
		logger.info("after saving merged pdf function");
		return outputPath;
	} catch (e: any) {
		logger.info(
			"PDF could not be created due to the error: " + JSON.stringify(e?.message),
		);
		return null;
	}
};
