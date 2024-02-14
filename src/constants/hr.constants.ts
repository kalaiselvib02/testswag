import { type User } from "../schemas/user.schema";

// email constants
export const rewardCategories = {
	award: "award",
	evento: "evento",
};

export const logMessages = {
	invalidEmployeeId: "Rewarder or rewardee invalid",
	catDescInvalid: "Reward category or description invalid",
	pointsInvalid: "Reward points invalid",
	invalidReward: "Invalid Reward due to",
	walletCommFailure: "Wallet api communication failure",
};

// export const rewardCategory = "rewardCategory";

export const errorMessages = {
	WRONG_XL_SKELETON: "The given XL file does not have the expected columns.",
};

export const expectedRewardKeys = [
	"rewardee",
	"rewardCategory",
	"description",
	"rewardPoints",
	"addedBy",
];

export const filterErrorMessages = {
	INVALID_REWARDEE: "Invalid coworker",
	INVALID_REWARDER: "Invalid addedBy",
	INVALID_REWARD_CATEGORY: "Invalid Reward Category",
	INVALID_DATE_RANGE: "Invalid Date Range",
};

export const COUPONS_EMAIL_CONTENT = (
	hr: User,
	totalRewardsCreated: number,
): Record<string, string> => {
	return {
		toAddress: hr?.email,
		subject: "Rewards creation successful!",
		html: `
<pre>Hi ${hr?.name},
<pre>
    PFA The coupons that have been successfully created and their coupon codes!
    Total rewards created: ${totalRewardsCreated}</pre>
<pre>Thanks,
CDW SWAG.</pre></pre>`,
	};
};
