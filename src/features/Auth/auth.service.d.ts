import type { UserTokenProp } from "../Users/user.type.js";
export declare const findUserByEmailAndPassword: (email: string, password: string) => Promise<{
    role: "USER" | "ADMIN";
    id: number;
    name: string;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
    email: string;
    password: string;
}>;
export declare const createUserToken: ({ userTokenPayload }: UserTokenProp) => Promise<string>;
export declare const findUserByEmail: (email: string) => Promise<{
    role: "USER" | "ADMIN";
    id: number;
    name: string;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
    email: string;
    password: string;
}>;
export declare const createPasswordResetToken: (email: string) => Promise<string>;
export declare const verifyPasswordResetToken: (token: string) => Promise<{
    id: number;
    userId: number;
    email: string;
}>;
export declare const markPasswordResetUsed: (id: number) => Promise<{
    id: number;
    token: string;
    expiryAt: Date;
    userId: number;
    used: boolean;
} | undefined>;
export declare const updateUserPassword: (email: string, password: string) => Promise<{
    id: number;
    email: string;
    name: string;
} | undefined>;
//# sourceMappingURL=auth.service.d.ts.map