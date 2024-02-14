export interface User {
  _id?: object;
  employeeId: number;
  name: string;
  email: string;
  role: object;
  createdAt?: Date;
  location?: object;
}

export interface UserInfo {
  employeeId: number;
  name: string;
  role: number;
  location: string;
}