import type { CreateUserType } from "./user.type.js";
export declare const createUserByDrizzle: (User: CreateUserType) => Promise<{
    role: "USER" | "ADMIN";
    id: number;
    name: string;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
    email: string;
    password: string;
}[]>;
export declare const findUserByEmail: (email: string) => Promise<{
    role: "USER" | "ADMIN";
    id: number;
    name: string;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
    email: string;
    password: string;
} | undefined>;
export declare const findUserByEmailByDrizzle: (email: string) => Promise<{
    role: "USER" | "ADMIN";
    id: number;
    name: string;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
    email: string;
    password: string;
} | undefined>;
export declare const findUserById: (userId: number) => Promise<{
    role: "USER" | "ADMIN";
    id: number;
    name: string;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
    email: string;
    password: string;
} | undefined>;
export declare const updateUserRole: (userId: number, role: "USER" | "ADMIN") => Promise<{
    id: number;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
    createdAt: Date;
} | undefined>;
export declare const getAllUsers: () => Promise<{
    role: "USER" | "ADMIN";
    id: number;
    name: string;
    createdAt: Date;
    email: string;
}[]>;
export declare const softDeleteUser: (userId: number) => Promise<{
    id: number;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    role: "USER" | "ADMIN";
    deletedAt: Date | null;
    isDeleted: boolean;
} | undefined>;
//# sourceMappingURL=user.repository.d.ts.map