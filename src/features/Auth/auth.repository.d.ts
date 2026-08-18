export declare const hashResetToken: (token: string) => string;
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
export declare const updateUserPassword: (email: string, password: string) => Promise<{
    id: number;
    email: string;
    name: string;
} | undefined>;
export declare const createPasswordReset: (userId: number, rawToken: string, expiryAt: Date) => Promise<{
    id: number;
    token: string;
    expiryAt: Date;
    userId: number;
    used: boolean;
} | undefined>;
export declare const findPasswordResetByToken: (rawToken: string) => Promise<{
    id: number;
    token: string;
    expiryAt: Date;
    userId: number;
    used: boolean;
    user: {
        role: "USER" | "ADMIN";
        id: number;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        isDeleted: boolean;
        email: string;
        password: string;
    } | null;
} | undefined>;
export declare const markPasswordResetUsed: (id: number) => Promise<{
    id: number;
    token: string;
    expiryAt: Date;
    userId: number;
    used: boolean;
} | undefined>;
//# sourceMappingURL=auth.repository.d.ts.map