import { IsString, IsEmail } from "class-validator";
import "reflect-metadata";
export class LoginDTO {
	@IsEmail()
	email: string;

	@IsString()
	password: string;

	constructor(email: string, password: string) {
		this.email = email;
		this.password = password;
	}
}
