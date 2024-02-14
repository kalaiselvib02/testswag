export interface TransactionObj {
    _id?: object;
    transactionId: number;
    employeeId: number;
    description: string;
    isCredited: boolean;
    amount: number;
    balance: number;
    createdAt? : Date;
}