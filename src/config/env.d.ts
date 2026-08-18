import "dotenv/config";
export declare const env: {
    NODE_ENV: "production" | "development" | "test";
    PORT: number;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    PASSWORD_RESET_EXPIRES_MINUTES: number;
    FRONTEND_URL?: string | undefined;
    SMTP_USER?: string | undefined;
    SMTP_PASS?: string | undefined;
};
//# sourceMappingURL=env.d.ts.map