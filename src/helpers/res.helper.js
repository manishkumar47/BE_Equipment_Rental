export const successResponse = (res, { status, message, data }) => {
    return res.status(status).json({
        success: true,
        message,
        data: data ?? null,
    });
};
export const errorResponse = (res, status, message, errors) => {
    return res.status(status).json({
        success: false,
        message,
        errors: errors ?? null,
    });
};
//# sourceMappingURL=res.helper.js.map