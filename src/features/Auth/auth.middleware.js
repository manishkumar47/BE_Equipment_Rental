import { authenticateRequest } from "../../helpers/auth.helper.js";
export const isAdmin = async (req, res, next) => {
    return authenticateRequest(req, res, next, "ADMIN");
};
export const auth = async (req, res, next) => {
    return authenticateRequest(req, res, next, "USER");
};
//# sourceMappingURL=auth.middleware.js.map