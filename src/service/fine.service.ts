import * as fineRepository from "../database/repository/fine.repository.js";
import { AppError } from "../util/appError.js";

export const getMyFines = async (userId: number) => {
  return fineRepository.getFinesByUserId(userId);
};

export const payFine = async (fineId: number, userId: number) => {
  const existing = await fineRepository.getFineById(fineId);
  if (!existing) {
    throw new AppError(404, "Fine not found!");
  }
  if (existing.userId !== userId) {
    throw new AppError(403, "Not authorized!");
  }
  if (existing.status !== "unpaid") {
    throw new AppError(409, `This fine is already '${existing.status}'.`);
  }

  const updated = await fineRepository.markFinePaid(fineId);
  if (!updated) {
    throw new AppError(409, "This fine has already been paid.");
  }
  return updated;
};
