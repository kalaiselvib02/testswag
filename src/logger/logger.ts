import path from "path";
import winston from "winston";
import fs from "fs";

const myFormat = winston.format.printf(({ level, message, timestamp }) => {
	return `${timestamp} ${level}: ${message}`;
});
// create the output path
const outputDir = "../logs/";
const outputPath = path.join(__dirname, outputDir);
if (fs.existsSync(outputPath)) {
	fs.mkdirSync(outputPath, { recursive: true });
}

const logger = winston.createLogger({
	transports: [
		new winston.transports.File({
			filename: path.join(outputPath, "combined.log"),
			level: process.env.LOG_LEVEL || "info",
			format: winston.format.combine(
				winston.format.errors({ stack: true }),
				winston.format.colorize(),
				winston.format.timestamp(),
				myFormat,
			),
		}),
		new winston.transports.File({
			filename: path.join(outputPath, "error.log"),
			level: "error",
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.timestamp(),
				myFormat,
			),
		}),
	],
});

if (process.env.NODE_ENV !== "production") {
	logger.add(
		new winston.transports.Console({
			level: process.env.LOG_LEVEL || "info",
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.timestamp(),
				myFormat,
			),
		}),
	);
}

export { logger };
