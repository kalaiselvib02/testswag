import { Date } from "mongoose";
import { Product } from "./product.type";

export interface OrdersType {
	_id?: object;
	orderId: number,
    employeeId: object,
    productId: number,
    quantity: number,
    statusId: object,
	createdAt?: Date,
    productDetails?: object,
    userDetails?: object,
    status?: object
}[];

export interface OrdersResponseObject {
	_id?: object;
	orderId: number,
    customisation?: object,
    employeeId?: object,
    productId?: number,
    quantity: number,
    statusId?: object,
	createdAt?: Date,
    productDetails?: object,
    userDetails?: object,
    status?: string,
    orderHistory?: object
};

export interface UserOrders {
    orderId: number,
    productDetails: {
        productId: number,
        title: string,
        rewardPoints: number,
        productUrl? : string
        isCustomisable? : boolean,
        productImgURL? : string,
    },
    quantity: number,
    // customisation?: {
    //     size?: string,
    //     color?: string,
    // }
    status: string,
    customisation : Object,
    orderHistory?: [],
    userDetails?: {
        employeeId: number,
        name: string,
        location: string,
    };
};

export interface UserOrderResponse {
    employeeId: number,
    employeeName: string,
    location: string,
    orders : Array<UserOrders>,
    redeemedPoints?: number,
    balance?: number,
};

export interface OrderHistoryArray  {
    userName: string,
    userId: number,
    status: string,
    time: string,
};

export interface UpdateOrderObject {
    orderId: number,
    changeTo: string,
    updateUserId: number,
    updateUserName: string,
    rejectReason?: string,
}

export interface ErrorOrderObject {
    productId: number,
    productName: string,
    message:string,
    errors : any
}

export interface ErrorOrderResponse {
    errors : Array<ErrorOrderObject>
}

export interface CartItems {
    cartId: number,
    productDetails: {
        productId: number,
        productName: string,
        points: number,
        productUrl? : string
    },
    quantity: number,
    customisation : Object
};

export interface CartItemsResponse {
    cartItems : Array<CartItems>,
};

export interface OrderType {
	_id?: object;
	orderId: number,
    employeeId: number,
    productId: number,
    quantity: number,
    statusId: object,
};

export interface Customisation {
    size?: string;
    color?: string;
};

export interface OrderHistory {
    _id?: object;
    status: object;
    history: {
        userName: string;
        userId: number;
        status: string;
        time: string;
        reason?: string;
    }[];
};

export interface UserOrderDetails {
    _id?: object;
    orderId: number;
    employeeId: number;
    transactionId: object;
    productId: number;
    statusId: object;
    quantity: number;
    customisation?: Customisation;
    createdAt?: Date;
    productDetails?: Product;
    orderHistory: OrderHistory;
};