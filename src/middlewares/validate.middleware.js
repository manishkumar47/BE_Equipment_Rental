import { ZodObject } from "zod";
import { errorResponse } from "../helpers/res.helper.js";
export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return errorResponse(res, 400, "Validation failed", result.error.issues.map((issue) => issue.message));
    }
    req.body = result.data;
    next();
};
//# sourceMappingURL=validate.middleware.js.map