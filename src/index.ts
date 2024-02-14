import "dotenv/config";
import "reflect-metadata";
import express, { type Application } from "express";
import { createDBConnection } from "./db";
import bodyParser from "body-parser";
import { logger } from "./logger/logger";
import { startCronJob, checkForJobsPastDueDates } from "./helpers/cron.helpers";
const path = require("path");

const cors = require("cors");
const PORT = process.env.PORT;
const routes = require("./routes/index");
process.env.TZ = "Asia/Kolkata";

// Create a new express application instance
const app: Application = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use("/api", routes);

app.use(express.static(path.join(__dirname, "../frontend")));

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// Create a database connection
createDBConnection();

app.listen(PORT, (): void => {
	logger.info(`CDW Swag server running on port ${PORT}`);
	checkForJobsPastDueDates();
	startCronJob();
});
module.exports = app;
