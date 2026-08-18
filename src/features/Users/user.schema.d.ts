import { z } from "zod";
export declare const userSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const updateUserRoleSchema: z.ZodObject<{
    role: z.ZodEnum<{
        USER: "USER";
        ADMIN: "ADMIN";
    }>;
}, z.core.$strip>;
//# sourceMappingURL=user.schema.d.ts.map