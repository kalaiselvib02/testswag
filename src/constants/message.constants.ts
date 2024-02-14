import { type StatusMailObject } from "../types/status.type";
import { dbOrderStatus } from "./db.constants";
import { type Transaction } from "../schemas/transaction.schema";
import { type Reward } from "../types/rewards.type";
import { type User } from "../types/user.type";
export const RESPONSE_CONSTANTS = {
	INVENTORY: {
		NO_FILE: {
			STATUS: 400,
			MESSAGE: "No File Found in the Server",
		},
		EMPTY: {
			STATUS: 400,
			MESSAGE: "No Data Found in the File",
		},
		NOT_FOUND: {
			STATUS: 204,
			MESSAGE: "No Data Found in the Server",
		},
		BAD_DATA: {
			STATUS: 400,
			MESSAGE: "Data Validation Failed",
		},
		CREATE: {
			STATUS: 200,
			MESSAGE: "All Products Created Successfully",
		},
		PARTIAL_CREATE: {
			STATUS: 201,
			MESSAGE: "Created Some Products Successfully",
		},
	},
	ORDER: {
		PLACED: {
			STATUS: 200,
			MESSAGE: "Order Placed Successfully",
		},
		BAD_DATA: {
			INVALID_PRODUCTS: {
				STATUS: 400,
				MESSAGE: "Products are invalid",
			},
			INSUFFICIENT_POINTS: {
				STATUS: 400,
				MESSAGE: "Points are not sufficient to place an order",
			},
		},
		OUT_OF_STOCK: {
			STATUS: 400,
			MESSAGE: "Products are out of stock",
		},
        NOT_PLACED : {
            STATUS : 400,
            MESSAGE : "Order could not be placed"
        },
	},
	CART: {
		BAD_DATA: {
			NO_CUSTOMISATION: {
				STATUS: 400,
				MESSAGE: "Customisation is not allowed",
			},
			INVALID_CUSTOMISATION: {
				STATUS: 400,
				MESSAGE: `Invalid $text is chosen for this product`,
			},
		},
		PLACED: {
			STATUS: 200,
			MESSAGE: "Item placed successfully in cart",
		},
        NOT_PLACED : {
            STATUS : 400,
            MESSAGE : "Items could not be added to cart"
        }
	},
};

export const statusUpdateMail = (
	statusMailObj: StatusMailObject,
): Record<string, string> => {
	const {
		userName,
		userBalance,
		orderNo,
		orderUpdatedStatus,
		productTitle,
		quantity,
		rewardPoints,
		totalPoints,
		productImgURL,
		rejectionReason,
	} = statusMailObj;
	return {
		subject: `CDW SWAG - Order ${orderNo} Status`,
		html: `
<pre>Hi ${userName},
        
        <pre>Your SWAG Order No: ${orderNo} is ${orderUpdatedStatus.toLowerCase()}.
        
        ORDER DETAILS:
		
        Product              : ${productTitle}
        <img src=${productImgURL} width='50' height='50'/>
        Quantity             : ${quantity}
        Product Points       : ${rewardPoints}
        ${
			orderUpdatedStatus.toUpperCase() === dbOrderStatus.REJECTED ||
			orderUpdatedStatus.toUpperCase() === dbOrderStatus.CANCELLED
				? "Refunded Points      : " + totalPoints
				: "Total Points         : " + totalPoints
		}
		<pre>${
			orderUpdatedStatus.toUpperCase() === dbOrderStatus.REJECTED
				? "Reason for Rejection : " + rejectionReason
				: ""
		}</pre>
		</pre>

        <pre>Your current balance after this transaction is ${userBalance}.</pre>
        
<pre>Thanks,
CDW SWAG.</pre></pre>`,
	};
};

export const rewardMail = (
	reward: Reward,
	rewardee: User,
	transaction: Transaction,
): Record<string, string> => {
	return {
		subject: "Reward from CDW!",
		html: `
<pre>Hi ${rewardee.name},
        
        <pre>Congrats! You've got a reward amount of <b>${
			reward.rewardPoints
		}</b> for ${reward.description} on ${reward.rewardCategory?.name}!</pre>

		<pre>${
			transaction.balance
				? "Your current balance after this reward is <b>" +
				  transaction.balance +
				  "</b>."
				: ""
		}</pre>
        
<pre>Thanks, 
CDW SWAG.</pre></pre>`,
	};
};

export const couponEmail = (
	reward: Reward,
	rewardee: User,
): Record<string, string> => {
	return {
		subject: "Reward from CDW!",
		html: `
<pre>Hi ${rewardee.name},
    
	Congrats! You've got a coupon amount of <b>${reward.rewardPoints}</b> for ${
		reward.description
	} on ${reward.rewardCategory?.name}!
<pre>    PFA the secret code for your reward.

    Unlock the PDF with the password &lt;Your employeeId&gt;_&lt;Capitalized first word of your name&gt;

    For example, if your name is James Earl Jones and your employeeId is 1000, your password would be "1000_James".

    use the coupon code physically given to you.
    ${
	reward.couponCode
		? `In case you lost it, kindly find your coupon code below:
    ${reward.couponCode}`
		: ""
}</pre></pre>
<pre>Thanks, 
CDW SWAG.</pre></pre>`,
	};
};

export const orderMail = (emailContent: any) => {
	return {
		subject: "Ordered in SWAG!",
		html: `
<pre>Hi ${emailContent.employeeName},
${emailContent.orders.map((order: any) => {
	return `<pre>
        Your SWAG Order No: ${order.orderId} is submitted.
        
        ORDER DETAILS:
		
        Product          : ${order.productDetails.title}
        <img src=${order.productDetails.productUrl} width='50' height='50'/>
        Quantity         : ${order.quantity}
        Reward Points    : ${order.productDetails.rewardPoints}
        Total Points     : ${order.productDetails.rewardPoints * order.quantity}
		</pre>`;
})}
        <pre>Your current balance after this order is ${emailContent.balance}.</pre>
        
<pre>Thanks,
CDW SWAG.</pre></pre>`,
	};
};
