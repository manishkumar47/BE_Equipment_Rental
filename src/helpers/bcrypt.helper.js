import bcrypt from "bcrypt";
export const hashpassword = async (password) => {
    return await bcrypt.hash(password, 10);
};
//# sourceMappingURL=bcrypt.helper.js.map