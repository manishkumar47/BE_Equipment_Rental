import db from "../../services/drizzle.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { user, passwordReset } from "../../db/schema.js";
export const hashResetToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
};
export const findUserByEmailAndPassword = async (email, password) => {
    const userexist = await db.query.user.findFirst({
        where: { email },
    });
    if (!userexist) {
        throw new Error("User not found!");
    }
    const isPasswordValid = await bcrypt.compare(password, userexist.password);
    if (!isPasswordValid) {
        throw new Error("Invalid password!");
    }
    return userexist;
};
export const findUserByEmail = async (email) => {
    const userexist = await db.query.user.findFirst({
        where: { email },
    });
    if (!userexist) {
        throw new Error("User not found!");
    }
    return userexist;
};
export const updateUserPassword = async (email, password) => {
    const [updated] = await db
        .update(user)
        .set({ password })
        .where(eq(user.email, email))
        .returning({ id: user.id, email: user.email, name: user.name });
    return updated;
};
export const createPasswordReset = async (userId, rawToken, expiryAt) => {
    const hashedToken = hashResetToken(rawToken);
    const [created] = await db
        .insert(passwordReset)
        .values({ token: hashedToken, expiryAt, userId })
        .returning();
    return created;
};
export const findPasswordResetByToken = async (rawToken) => {
    const hashedToken = hashResetToken(rawToken);
    return db.query.passwordReset.findFirst({
        where: {
            token: hashedToken,
            used: false,
            expiryAt: { gt: new Date() },
        },
        with: {
            user: true,
        },
    });
};
export const markPasswordResetUsed = async (id) => {
    const [updated] = await db
        .update(passwordReset)
        .set({ used: true })
        .where(eq(passwordReset.id, id))
        .returning();
    return updated;
};
//# sourceMappingURL=auth.repository.js.map