import express from "express";
const { routesConstants } = require("../constants");
const authRoute = require("../routes/auth");
const adminRouter = require("../routes/admin");
const userRoute = require("../routes/user");
const hrRoute = require("../routes/hr");
const employeeRoute = require("../routes/employees");

const router = express.Router();

router.use(routesConstants.AUTH, authRoute);
router.use(routesConstants.HR, hrRoute);
router.use(routesConstants.USER, userRoute);
router.use(routesConstants.ADMIN, adminRouter);
router.use(routesConstants.EMPLOYEES, employeeRoute);

module.exports = router;
