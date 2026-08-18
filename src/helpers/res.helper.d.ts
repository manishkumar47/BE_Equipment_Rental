import type { Response } from "express";
type ApiResponse<T = unknown> = {
    status: number;
    message: string;
    data?: T;
};
export declare const successResponse: <T>(res: Response, { status, message, data }: ApiResponse<T>) => Response<any, Record<string, any>>;
export declare const errorResponse: (res: Response, status: number, message: string, errors?: unknown) => Response<any, Record<string, any>>;
export {};
//# sourceMappingURL=res.helper.d.ts.map