import db from "../database/db-connection.js";
import * as returnRepository from "../database/repository/return.repository.js";
import * as fineRepository from "../database/repository/fine.repository.js";
import { AppError } from "../util/appError.js";

// Fine tier constants
const TIER_1_RATE = 100; // ₹100/day for days 1-7
const TIER_2_RATE = 200; // ₹200/day for days 8-14
const TIER_1_MAX_DAYS = 7;
const TIER_2_MAX_DAYS = 14; // cap — no charges accrue beyond day 14
const DAMAGE_FEE_MAX_MULTIPLIER = 1.5; // damageFee must not exceed 1.5× equipment.price

/**
 * Calculate tiered late fee, capped at day 14.
 * Maximum possible: (7 × 100) + (7 × 200) = ₹2,100
 */
const calculateLateFee = (daysLate: number): number => {
  if (daysLate <= 0) return 0;

  const tier1Days = Math.min(daysLate, TIER_1_MAX_DAYS);
  const tier2Days = Math.max(0, Math.min(daysLate, TIER_2_MAX_DAYS) - TIER_1_MAX_DAYS);

  return tier1Days * TIER_1_RATE + tier2Days * TIER_2_RATE;
};

/**
 * Calculate the number of full calendar days late.
 * Uses confirmation time (now) vs booking.rentTo.
 */
const calculateDaysLate = (rentTo: Date): number => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(rentTo).getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * STEP 1: User requests return.
 * Sets status = 'return_requested', does NOT touch equipment quantity or fines.
 */
export const requestReturn = async (bookingId: number, userId: number) => {
  // Fetch booking first for detailed error messages
  const booking = await returnRepository.getBookingForReturn(bookingId);

  if (!booking) {
    throw new AppError(404, "Booking not found!");
  }

  if (booking.userId !== userId) {
    throw new AppError(403, "Not authorized!");
  }

  if (booking.status !== "active") {
    throw new AppError(
      409,
      `Return request cannot be made — booking is currently '${booking.status}'.`,
    );
  }

  // Conditional UPDATE with WHERE guards (active + owner + not deleted)
  const updated = await returnRepository.requestReturn(bookingId, userId);

  if (!updated) {
    throw new AppError(
      409,
      "Return already requested or booking state changed. Please try again.",
    );
  }

  return updated;
};

/**
 * STEP 2: Admin views pending return requests (paginated).
 * Augments bookings with computedStatus for overdue display.
 */
export const getPendingReturnRequests = async (
  page: number,
  limit: number,
  search?: string,
) => {
  const { data, total } = await returnRepository.getPendingReturnRequests(
    page,
    limit,
    search,
  );

  const totalPages = Math.ceil(total / limit);

  // Augment with computedStatus (for display — overdue detection on active bookings)
  const augmented = data.map((booking) => {
    const now = new Date();
    const isOverdue =
      booking.status === "active" && new Date(booking.rentTo) < now;

    return {
      ...booking,
      computedStatus: isOverdue ? "overdue" : booking.status,
    };
  });

  return {
    data: augmented,
    total,
    page,
    limit,
    totalPages,
  };
};

/**
 * STEP 3: Admin confirms return.
 * All operations (status update, fine insertion, stock restoration) happen
 * atomically in a single DB transaction.
 *
 * Fine logic (3 independent components):
 *   A. Late fee: tiered, capped at day 14 (max ₹2,100). Runs for ALL conditions.
 *   B. Damage fee: admin-entered amount (capped ≤ 1.5× equipment.price). Only for 'damaged'.
 *   C. Replacement cost: equipment.price × quantity. Only for 'lost'.
 *
 * Stock restoration: 'good' and 'damaged' restore stock. 'lost' does NOT.
 */
export const confirmReturn = async (
  bookingId: number,
  condition: "good" | "damaged" | "lost",
  conditionNotes?: string,
  damageFee?: number,
) => {
  // Fetch booking with equipment for price lookups
  const booking = await returnRepository.getBookingForReturn(bookingId);

  if (!booking) {
    throw new AppError(404, "Booking not found!");
  }

  if (booking.status !== "return_requested") {
    throw new AppError(
      409,
      `Cannot confirm return — booking is currently '${booking.status}', expected 'return_requested'.`,
    );
  }

  const equipmentData = booking.equipment;
  if (!equipmentData) {
    throw new AppError(500, "Equipment data not found for this booking!");
  }

  // Validate damage fee cap (service-layer check — requires equipment price from DB)
  if (condition === "damaged" && damageFee !== undefined) {
    const maxDamageFee = equipmentData.price * DAMAGE_FEE_MAX_MULTIPLIER;
    if (damageFee > maxDamageFee) {
      throw new AppError(
        400,
        `Damage fee (₹${damageFee}) exceeds maximum allowed (₹${maxDamageFee} = 1.5× equipment price of ₹${equipmentData.price}).`,
      );
    }
  }

  // Calculate fine components
  const daysLate = calculateDaysLate(booking.rentTo);

  // Component A: Late fee (always, capped at day 14)
  const lateFee = calculateLateFee(daysLate);

  // Component B: Damage fee (only if 'damaged')
  const conditionDamageFee = condition === "damaged" ? (damageFee ?? 0) : 0;

  // Component C: Replacement cost (only if 'lost')
  const replacementCost =
    condition === "lost" ? equipmentData.price * booking.quantity : 0;

  const totalFine = lateFee + conditionDamageFee + replacementCost;

  // Build reason string for the fine record
  const reasonParts: string[] = [];
  if (lateFee > 0) reasonParts.push(`late:${lateFee}`);
  if (conditionDamageFee > 0) reasonParts.push(`damaged:${conditionDamageFee}`);
  if (replacementCost > 0) reasonParts.push(`lost:${replacementCost}`);
  const reason = reasonParts.join(",") || null;

  // Execute all operations atomically in a single transaction
  const result = await db.transaction(async (tx) => {
    // 1. Update booking status (conditional WHERE guards race condition)
    const updatedBooking = await returnRepository.confirmReturn(
      bookingId,
      { returnCondition: condition, conditionNotes },
      tx,
    );

    if (!updatedBooking) {
      throw new AppError(
        409,
        "Booking has already been processed by another admin.",
      );
    }

    // 2. Create fine record if there's any fine amount
    let fineRecord = null;
    if (totalFine > 0) {
      fineRecord = await fineRepository.createFine(
        {
          rentalBookingId: bookingId,
          userId: booking.userId,
          amount: totalFine,
          daysLate,
          reason: reason!,
        },
        tx,
      );
    }

    // 3. Restore equipment stock (only if NOT lost)
    if (condition !== "lost") {
      await returnRepository.restoreEquipmentStock(
        booking.equipmentId,
        booking.quantity,
        tx,
      );
    }

    return { updatedBooking, fineRecord };
  });

  return {
    booking: result.updatedBooking,
    fine: result.fineRecord
      ? {
          id: result.fineRecord.id,
          totalFine,
          lateFee,
          conditionFee: conditionDamageFee + replacementCost,
          daysLate,
          breakdown: {
            lateFee,
            damageFee: conditionDamageFee,
            replacementCost,
          },
        }
      : null,
  };
};

/**
 * Admin rejects a return request.
 * Reverts booking to 'active' status with a rejection reason.
 */
export const rejectReturn = async (
  bookingId: number,
  rejectionReason: string,
) => {
  const booking = await returnRepository.getBookingForReturn(bookingId);

  if (!booking) {
    throw new AppError(404, "Booking not found!");
  }

  if (booking.status !== "return_requested") {
    throw new AppError(
      409,
      `Cannot reject — booking is currently '${booking.status}', expected 'return_requested'.`,
    );
  }

  const updated = await returnRepository.rejectReturn(
    bookingId,
    rejectionReason,
  );

  if (!updated) {
    throw new AppError(
      409,
      "Booking has already been processed by another admin.",
    );
  }

  return updated;
};
