import db from "../database/db-connection.js";
import * as returnRepository from "../database/repository/return.repository.js";
import * as fineRepository from "../database/repository/fine.repository.js";
import * as rentalBookingItemRepository from "../database/repository/rentalBookingItem.repository.js";
import * as equipmentItemRepository from "../database/repository/equipmentItem.repository.js";
import { AppError } from "../util/appError.js";
import type { EquipmentItemStatus } from "../types/equipmentItem.type.js";
import type { ReturnItemDecision } from "../types/rentalBooking.type.js";

// Fine tier constants
const TIER_1_RATE = 100; // ₹100/day for days 1-7
const TIER_2_RATE = 200; // ₹200/day for days 8-14
const TIER_1_MAX_DAYS = 7;
const TIER_2_MAX_DAYS = 14; // cap — no charges accrue beyond day 14
const DAMAGE_FEE_MAX_MULTIPLIER = 1.5; // damageFee must not exceed 1.5× equipment.price
const FINE_DUE_DAYS = 5; // user must pay/resolve a fine within 5 days

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
 *
 * Two paths, decided by whether the booking has individually tracked
 * (serialized) physical units assigned to it:
 *  - Untracked (no rental_booking_items rows): legacy whole-booking return,
 *    unchanged from before.
 *  - Tracked: `quantity` picks how many of the still-outstanding units to
 *    submit now (defaults to all of them, so an unmigrated frontend that
 *    never sends a quantity keeps behaving exactly like before). Only one
 *    pending return request is allowed per booking at a time — enforced by
 *    the same status='active' guard the legacy path already used.
 */
export const requestReturn = async (
  bookingId: number,
  userId: number,
  quantity?: number,
) => {
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

  const outstanding = await rentalBookingItemRepository.getOutstandingItems(bookingId);

  if (outstanding.length === 0) {
    // Legacy / untracked equipment: whole-booking return, unchanged.
    const updated = await returnRepository.requestReturn(bookingId, userId);
    if (!updated) {
      throw new AppError(
        409,
        "Return already requested or booking state changed. Please try again.",
      );
    }
    return updated;
  }

  const qty = quantity ?? outstanding.length;
  if (!Number.isInteger(qty) || qty <= 0 || qty > outstanding.length) {
    throw new AppError(
      400,
      `Invalid return quantity — must be a whole number between 1 and ${outstanding.length} (units still outstanding).`,
    );
  }

  const requestedAt = new Date();
  const itemIdsToRequest = outstanding.slice(0, qty).map((item) => item.id);

  return db.transaction(async (tx) => {
    await rentalBookingItemRepository.markItemsReturnRequested(itemIdsToRequest, requestedAt, tx);

    const updated = await returnRepository.requestReturn(bookingId, userId, tx);
    if (!updated) {
      throw new AppError(
        409,
        "Return already requested or booking state changed. Please try again.",
      );
    }
    return updated;
  });
};

/**
 * STEP 2: Admin views pending return requests (paginated).
 * Augments bookings with computedStatus for overdue display, and — for
 * serialized bookings — the exact set of units in the pending group
 * (`pendingItems`). An empty `pendingItems` array means this is a legacy/
 * untracked booking where the whole quantity is what's pending.
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

  const pendingItemRows = await rentalBookingItemRepository.getPendingReturnItemsForBookings(
    data.map((booking) => booking.id),
  );
  const itemsByBooking = new Map<
    number,
    { id: number; equipmentItemId: number; serialNumber: string }[]
  >();
  for (const row of pendingItemRows) {
    const existing = itemsByBooking.get(row.rentalBookingId) ?? [];
    existing.push({ id: row.id, equipmentItemId: row.equipmentItemId, serialNumber: row.serialNumber });
    itemsByBooking.set(row.rentalBookingId, existing);
  }

  // Augment with computedStatus (for display — overdue detection on active bookings)
  const augmented = data.map((booking) => {
    const now = new Date();
    const isOverdue =
      booking.status === "active" && new Date(booking.rentTo) < now;

    return {
      ...booking,
      computedStatus: isOverdue ? "overdue" : booking.status,
      pendingItems: itemsByBooking.get(booking.id) ?? [],
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

type ConfirmReturnPayload = {
  condition?: "good" | "damaged" | "lost";
  conditionNotes?: string;
  damageFee?: number;
  items?: ReturnItemDecision[];
};

/**
 * STEP 3: Admin confirms return.
 *
 * Serialized bookings (there's a pending per-unit group): admin submits a
 * condition (+ damage fee where relevant) for every pending unit by its
 * equipmentItemId. One combined fine covers the whole group, itemized in
 * its `reason` text. The booking only flips to fully 'returned' once every
 * unit on it has come back — otherwise it goes back to 'active' with the
 * remainder still outstanding.
 *
 * Legacy / untracked bookings: unchanged single-condition, whole-quantity
 * flow.
 */
export const confirmReturn = async (bookingId: number, payload: ConfirmReturnPayload) => {
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

  const daysLate = calculateDaysLate(booking.rentTo);
  const lateFee = calculateLateFee(daysLate);

  const pendingItems = await rentalBookingItemRepository.getPendingReturnItems(bookingId);

  if (pendingItems.length > 0) {
    // ─── Serialized / per-unit path ──────────────────────────────────
    if (!payload.items || payload.items.length === 0) {
      throw new AppError(
        400,
        "This booking has individually tracked units — submit a condition for every pending unit via 'items'.",
      );
    }

    const pendingIds = new Set(pendingItems.map((i) => i.equipmentItemId));
    const payloadIds = new Set(payload.items.map((i) => i.equipmentItemId));
    const sameSet =
      pendingIds.size === payloadIds.size &&
      [...pendingIds].every((id) => payloadIds.has(id));
    if (!sameSet) {
      throw new AppError(
        400,
        "Submitted items must exactly match the pending return items for this booking (no more, no fewer).",
      );
    }

    const maxDamageFee = equipmentData.price * DAMAGE_FEE_MAX_MULTIPLIER;
    for (const item of payload.items) {
      if (item.condition === "damaged") {
        if (item.damageFee === undefined) {
          throw new AppError(400, `Damage fee is required for item #${item.equipmentItemId}.`);
        }
        if (item.damageFee > maxDamageFee) {
          throw new AppError(
            400,
            `Damage fee (₹${item.damageFee}) for item #${item.equipmentItemId} exceeds maximum allowed (₹${maxDamageFee} = 1.5× equipment price of ₹${equipmentData.price}).`,
          );
        }
      }
    }

    const serialByItemId = new Map(pendingItems.map((i) => [i.equipmentItemId, i.serialNumber]));

    let damageFeeTotal = 0;
    let replacementTotal = 0;
    const reasonParts: string[] = [];
    if (lateFee > 0) reasonParts.push(`late:${lateFee}`);

    for (const item of payload.items) {
      const serial = serialByItemId.get(item.equipmentItemId) ?? `item#${item.equipmentItemId}`;
      if (item.condition === "damaged") {
        const fee = item.damageFee ?? 0;
        damageFeeTotal += fee;
        reasonParts.push(`${serial}:damaged:${fee}`);
      } else if (item.condition === "lost") {
        replacementTotal += equipmentData.price;
        reasonParts.push(`${serial}:lost:${equipmentData.price}`);
      }
    }

    const totalFine = lateFee + damageFeeTotal + replacementTotal;
    const reason = reasonParts.join(",") || null;
    const restorableCount = payload.items.filter((i) => i.condition !== "lost").length;

    const result = await db.transaction(async (tx) => {
      const rowIdByItemId = new Map(pendingItems.map((i) => [i.equipmentItemId, i.id]));
      for (const item of payload.items!) {
        const rowId = rowIdByItemId.get(item.equipmentItemId)!;
        await rentalBookingItemRepository.confirmItemReturn(
          rowId,
          { condition: item.condition, damageFee: item.condition === "damaged" ? item.damageFee ?? 0 : null },
          new Date(),
          tx,
        );
      }

      // Update physical unit statuses, grouped by target status.
      const idsByStatus: Record<EquipmentItemStatus, number[]> = {
        available: [],
        rented: [],
        under_repair: [],
        damaged: [],
        lost: [],
        retired: [],
      };
      for (const item of payload.items!) {
        const status: EquipmentItemStatus = item.condition === "good" ? "available" : item.condition;
        idsByStatus[status].push(item.equipmentItemId);
      }
      for (const status of Object.keys(idsByStatus) as EquipmentItemStatus[]) {
        const ids = idsByStatus[status];
        if (ids.length > 0) {
          await equipmentItemRepository.updateEquipmentItemsStatus(ids, status, tx);
        }
      }

      if (restorableCount > 0) {
        await returnRepository.restoreEquipmentStock(booking.equipmentId, restorableCount, tx);
      }

      let fineRecord = null;
      if (totalFine > 0) {
        fineRecord = await fineRepository.createFine(
          {
            rentalBookingId: bookingId,
            userId: booking.userId,
            amount: totalFine,
            daysLate,
            reason: reason!,
            dueDate: new Date(Date.now() + FINE_DUE_DAYS * 24 * 60 * 60 * 1000),
          },
          tx,
        );
      }

      const remaining = await rentalBookingItemRepository.countOutstandingItems(bookingId, tx);
      const updatedBooking = await returnRepository.finalizeSerializedReturn(
        bookingId,
        remaining === 0,
        tx,
      );
      if (!updatedBooking) {
        throw new AppError(409, "Booking has already been processed by another admin.");
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
            conditionFee: damageFeeTotal + replacementTotal,
            daysLate,
            breakdown: {
              lateFee,
              damageFee: damageFeeTotal,
              replacementCost: replacementTotal,
            },
          }
        : null,
      items: payload.items.map((item) => ({
        equipmentItemId: item.equipmentItemId,
        condition: item.condition,
        damageFee: item.condition === "damaged" ? item.damageFee ?? 0 : null,
      })),
    };
  }

  // ─── Legacy / untracked equipment path (unchanged) ────────────────
  if (!payload.condition) {
    throw new AppError(400, "Condition is required to confirm this return.");
  }
  const { condition, conditionNotes, damageFee } = payload;

  if (condition === "damaged" && damageFee !== undefined) {
    const maxDamageFee = equipmentData.price * DAMAGE_FEE_MAX_MULTIPLIER;
    if (damageFee > maxDamageFee) {
      throw new AppError(
        400,
        `Damage fee (₹${damageFee}) exceeds maximum allowed (₹${maxDamageFee} = 1.5× equipment price of ₹${equipmentData.price}).`,
      );
    }
  }

  const conditionDamageFee = condition === "damaged" ? (damageFee ?? 0) : 0;
  const replacementCost = condition === "lost" ? equipmentData.price * booking.quantity : 0;
  const totalFine = lateFee + conditionDamageFee + replacementCost;

  const reasonParts: string[] = [];
  if (lateFee > 0) reasonParts.push(`late:${lateFee}`);
  if (conditionDamageFee > 0) reasonParts.push(`damaged:${conditionDamageFee}`);
  if (replacementCost > 0) reasonParts.push(`lost:${replacementCost}`);
  const reason = reasonParts.join(",") || null;

  const result = await db.transaction(async (tx) => {
    const updatedBooking = await returnRepository.confirmReturn(
      bookingId,
      { returnCondition: condition, conditionNotes },
      tx,
    );

    if (!updatedBooking) {
      throw new AppError(409, "Booking has already been processed by another admin.");
    }

    let fineRecord = null;
    if (totalFine > 0) {
      fineRecord = await fineRepository.createFine(
        {
          rentalBookingId: bookingId,
          userId: booking.userId,
          amount: totalFine,
          daysLate,
          reason: reason!,
          dueDate: new Date(Date.now() + FINE_DUE_DAYS * 24 * 60 * 60 * 1000),
        },
        tx,
      );
    }

    if (condition !== "lost") {
      await returnRepository.restoreEquipmentStock(booking.equipmentId, booking.quantity, tx);
    }

    const assignedItemIds = await rentalBookingItemRepository.getAssignedItemIds(bookingId, tx);
    if (assignedItemIds.length > 0) {
      const itemStatus: EquipmentItemStatus = condition === "good" ? "available" : condition;
      await equipmentItemRepository.updateEquipmentItemsStatus(assignedItemIds, itemStatus, tx);
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
 * Reverts booking to 'active' status with a rejection reason. For a
 * serialized booking, also un-pends the items in the (single) pending
 * group so the user can request a return again later.
 */
export const rejectReturn = async (bookingId: number, rejectionReason: string) => {
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

  return db.transaction(async (tx) => {
    const pendingItems = await rentalBookingItemRepository.getPendingReturnItems(bookingId, tx);
    if (pendingItems.length > 0) {
      await rentalBookingItemRepository.clearReturnRequested(
        pendingItems.map((i) => i.id),
        tx,
      );
    }

    const updated = await returnRepository.rejectReturn(bookingId, rejectionReason, tx);
    if (!updated) {
      throw new AppError(409, "Booking has already been processed by another admin.");
    }
    return updated;
  });
};
