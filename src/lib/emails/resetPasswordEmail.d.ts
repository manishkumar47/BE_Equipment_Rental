type UserSimple = {
    name: string;
    email: string;
};
export declare const sendResetPassword: ({ user, token, }: {
    user: UserSimple;
    token: string;
}) => Promise<boolean>;
export default sendResetPassword;
//# sourceMappingURL=resetPasswordEmail.d.ts.map