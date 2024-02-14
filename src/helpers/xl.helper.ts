import fs from "fs";
import XLSX from "xlsx-js-style";
import path from "path";
import { logger } from "../logger/logger";

/**
 * @description takes a multer file(.xlsx) and converts the first sheet in it to JSON
 * @param Express.Multer.File
 * @returns JSON | null
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getJSONFromSheet = (file: Express.Multer.File): any[] | null => {
	let jsonData = null;

	if (file?.path) {
		// Instantiating a workbook
		const fileBuffer = fs.readFileSync(file.path);
		const workbook = XLSX.read(fileBuffer, { type: "buffer" });
		if (workbook.SheetNames.length) {
			// Converting the first sheet of the workbook to JSON
			const worksheet = workbook.Sheets[workbook.SheetNames[0]];
			jsonData = XLSX.utils.sheet_to_json(worksheet);
		}
	}
	// Deleting the uploaded file after obtaining the data
	fs.unlink(file.path, (err) => {
		if (err) {
			logger.error("Error deleting file:", err);
		}
	});

	return jsonData;
};

/**
 * @description takes reward data and converts the data in it to a new worksheet of rewards
 * @param multerFile: Express.Multer.File
 * @returns outputPath — : string | null
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createXLFromData = (jsonData: any): string | null => {
	try {
		// Create a new worksheet
		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.json_to_sheet(jsonData);

		worksheet["!cols"] = [
			{ wch: 35 },
			{ wch: 25 },
			{ wch: 35 },
			{ wch: 25 },
			{ wch: 35 },
			{ wch: 35 },
		];
		if (jsonData?.length) {
			for (let row = 0; row <= jsonData.length; row++) {
				for (let col = 0; col < Object.keys(jsonData[0])?.length; col++) {
					const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
					// Add center alignment to every cell
					worksheet[cellRef].s = {
						alignment: { horizontal: "center", vertical: "center" },
						font: { sz: 12.5 },
					};
					if (row === 0) {
						// Format headers and names
						worksheet[cellRef].s = {
							...worksheet[cellRef].s,
							font: { bold: true, sz: 13 },
						};
					}
				}
			}
		}

		// create the output path
		const outputDir = "../uploads/";
		const outpuDirPath = path.join(__dirname, outputDir);
		if (fs.existsSync(outpuDirPath)) {
			fs.mkdirSync(outpuDirPath, { recursive: true });
		}
		const outputFile = `successfulRewardsFile.xlsx`;
		const outputPath = path.join(outpuDirPath, outputFile);

		XLSX.utils.book_append_sheet(workbook, worksheet, "rewards");
		XLSX.writeFile(workbook, outputPath);
		return outputPath;
	} catch (e) {
		logger.error(JSON.stringify(e));
		return null;
	}
};
