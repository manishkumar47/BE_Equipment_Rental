import jwt from "jsonwebtoken";
export interface CreateUserType {
  name: string;
  email: string;
  password: string;
  role?: "USER" | "ADMIN";
}

export interface UpdateUserRoleType {
  role: "USER" | "ADMIN";
}

export type UserTokenProp = {
  userTokenPayload: {
    id: number;
    email: string;
    role: "USER" | "ADMIN";
  };
};
export interface MyTokenPayload extends jwt.JwtPayload {
  email: string;
  id: number;
  role: string;
}
