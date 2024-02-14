import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "../logger/logger";
import { type Attachment } from "nodemailer/lib/mailer";
// import { logger } from "../logger";

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
	if (transporter) {
		return transporter;
	} else {
		if (!process.env.EMAIL_ADDRESS || !process.env.PASSWORD) {
			return null;
		}
		transporter = nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			service: process.env.SERVICE,
			secure: true,
			auth: {
				user: process.env.EMAIL_ADDRESS,
				pass: process.env.PASSWORD,
			},
			tls: {
				ciphers: "SSLv3",
				rejectUnauthorized: false,
			},
		});
		return transporter;
	}
};

export const sendEmail = async (
	mailObj: Record<string, string | undefined>,
	attachments: Attachment[] = [],
): Promise<void> => {
	const { toAddress, subject, text, html } = mailObj;
	if (toAddress && subject && (text || html)) {
		const transporter = getTransporter();
		// send mail with defined transport object
		if (transporter) {
			const info = await transporter.sendMail({
				from: process.env.EMAIL_ADDRESS,
				to: toAddress,
				subject,
				text,
				html,
				attachments,
			});
			if (!info.messageId) {
				logger.error(`Email to ${toAddress} about ${subject} not sent`);
			}
		} else {
			logger.error(
				`Email to ${toAddress} about ${subject} not sent due to transporter issue`,
			);
		}
	}
};
