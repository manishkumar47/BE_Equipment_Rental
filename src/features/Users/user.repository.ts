import { eq } from "drizzle-orm";
import { user } from "../../db/schema.js";
import db from "../../services/drizzle.js";
import type { CreateUserType } from "./user.type.js";

export const createUserByDrizzle = async (User: CreateUserType) => {
  const userToBe: typeof user.$inferInsert = {
    name: User.name,
    email: User.email,
    password: User.password,
  };

  const createdUser = await db.insert(user).values(userToBe).returning();
  return createdUser;
};

export const findUserByEmail = async (email: string) => {
  return db.query.user.findFirst({
    where: { email },
  });
};

export const findUserByEmailByDrizzle = async (email: string) => {
  return db.query.user.findFirst({
    where: { email },
  });
};

export const findUserById = async (userId: number) => {
  return db.query.user.findFirst({
    where: { id: userId },
  });
};

export const updateUserRole = async (
  userId: number,
  role: "USER" | "ADMIN",
) => {
  const [updated] = await db
    .update(user)
    .set({ role })
    .where(eq(user.id, userId))
    .returning({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  return updated;
};

export const getAllUsers = async () => {
  return db.query.user.findMany({
    where: { isDeleted: false },
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
};

export const softDeleteUser = async (userId: number) => {
  const [updated] = await db
    .update(user)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(eq(user.id, userId))
    .returning();
  return updated;
};
