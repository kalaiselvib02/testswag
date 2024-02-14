import { logger } from "../logger/logger";
import { expireAllCoupons, expireUserPoints } from "../user/user.service";
// import { dbAutoBackUp } from "./backup.helpers";
const cron = require('node-cron');
const JobSchema = require("../schemas/job.schema");
const JobLogSchema = require("../schemas/jobLog.schema");
const expirationCronExpression = process.env.EXPIRATION_JOB_CRON_EXPRESSION;
const backupCronExpression = process.env.BACKUP_JOB_CRON_EXPRESSION;
const isExpirationJobEnabled = process.env.IS_EXPIRATION_JOB_ENABLED;
const isDBBackupJobEnabled = process.env.IS_DB_BACKUP_JOB_ENABLED;

const expirationtask = cron.schedule(expirationCronExpression, async() => {
    if(isExpirationJobEnabled === "true") {
        logger.info("CRON Expiration Job : Checking for Expiration Date");
        try {
            const JobCount = await JobSchema.countDocuments({});
            if(JobCount === 0) {
                logger.info("CRON Expiration Job : No Jobs in queue");
            } else {
                const currentDate = new Date();
                const Job = await JobSchema.findOne({});
                const expirationDate = Job.expirationDate;
                
                if(expirationDate.toLocaleDateString('en-IN') === currentDate.toLocaleDateString('en-IN')) {
                    logger.info("CRON Expiration Job : Expiration Date is today - Deleting All Coupons");
                    await expireAllCoupons();
                    await expireUserPoints();
                    
                    // Completed Job is removed from the queue
                    const completedJobId = Job.jobId;
                    await JobSchema.deleteMany({});
                    const JobLogs = await JobLogSchema.updateOne(
                        {jobId: completedJobId},
                        {
                            $set: { isActive: false, isCompleted: true}
                        }
                    );
                }
            }
    
        } catch (error) {
            logger.error("CRON Expiration Job Error:"+error);
        }
    }
},
{
    scheduled: true,
    timezone: "Asia/Kolkata",
});

const backupTask = cron.schedule(backupCronExpression, async() => {
    if(isDBBackupJobEnabled === "true") {
        logger.info("CRON Backup Job : Running Backup Job");
        try {
            // await dbAutoBackUp();
        } catch (error) {
            logger.error("CRON Backup Job : Error -"+error);
        }
    }
},
{
    scheduled: true,
    timezone: "Asia/Kolkata",
});

export const startCronJob = () => {
    expirationtask.start();
    backupTask.start();
    logger.info("CRON Jobs Started");
};
  
export const stopCronJob = () => {
    expirationtask.stop();
    logger.info("CRON Job Stoped");
};

/**
 *  Checks for Jobs past due date and removes them at the start of the server
 */ 
export const checkForJobsPastDueDates = async () => {
    try {
        const JobCount = await JobSchema.countDocuments({});
        if(JobCount !== 0) {
            const Job = await JobSchema.findOne({});
            const currentDate = new Date();
            const expirationDate = Job.expirationDate;
            
            if(expirationDate < currentDate) {
                logger.info("CRON : Expiration Date is past the due date - Deleting the Existing Job");

                // Existing Job is removed and its status is updated in the log
                const inCompleteJobId = Job.jobId;
                await JobSchema.deleteMany({});
                const JobLogs = await JobLogSchema.updateOne(
                    {jobId: inCompleteJobId},
                    {
                        $set: { isActive: false, isCompleted: false}
                    }
                );
            }
        }

    } catch (error: any) {
        logger.error("CRON : Jobs Past Due Date Error - "+error);
    }
};