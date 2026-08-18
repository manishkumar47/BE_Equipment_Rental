import type { CreateUserType } from "./user.type.js";
export declare const createUser: (data: CreateUserType) => Promise<{
    role: "USER" | "ADMIN";
    id: number;
    name: string;
    createdAt: Date;
    deletedAt: Date | null;
    isDeleted: boolean;
    email: string;
    password: string;
}[]>;
export declare const getAllUsers: () => Promise<{
    role: "USER" | "ADMIN";
    id: number;
    name: string;
    createdAt: Date;
    email: string;
}[]>;
export declare const updateUserRole: (userId: number, role: "USER" | "ADMIN") => Promise<{
    id: number;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
    createdAt: Date;
} | undefined>;
export declare const deleteUser: (userId: number) => Promise<{
    id: number;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    role: "USER" | "ADMIN";
    deletedAt: Date | null;
    isDeleted: boolean;
} | undefined>;
//# sourceMappingURL=user.service.d.ts.map