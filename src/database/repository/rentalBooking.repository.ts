import db from "../db-connection.js";
import { and, count, eq, gte, ilike, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { equipment, rentalBooking, user, bookingStatus } from "../schema/schema.js";
import type { CreateRentalBookingObject } from "../../types/rentalBooking.type.js";

export type BookingStatusFilter = (typeof bookingStatus.enumValues)[number];

/**
 * Atomically decrements equipment stock, guarded by `quantity >= x` in the
 * WHERE clause so concurrent bookings for the last unit(s) can't both pass
 * an application-level check and oversell the same stock (no row is
 * returned if there isn't enough left).
 */
export const decrementEquipmentStock = async (
  equipmentId: number,
  quantity: number,
  tx: NodePgDatabase<any> = db,
) => {
  const [updated] = await tx
    .update(equipment)
    .set({ quantity: sql`${equipment.quantity} - ${quantity}` })
    .where(and(eq(equipment.id, equipmentId), gte(equipment.quantity, quantity)))
    .returning();
  return updated;
};

export const insertRentalBooking = async (
  createRentalBookingObject: CreateRentalBookingObject,
  tx: NodePgDatabase<any> = db,
) => {
  const [inserted] = await tx
    .insert(rentalBooking)
    .values(createRentalBookingObject)
    .returning();
  return inserted;
};

export const createRentalBooking = async (
  createRentalBookingObject: CreateRentalBookingObject,
) => {
  const inserted = await insertRentalBooking(createRentalBookingObject);
  return getRentalBookingById(inserted!.id);
};

export const getRentalBookingById = async (bookingId: number) => {
  return db.query.rentalBooking.findFirst({
    where: { id: bookingId, isDeleted: false },
    with: {
      user: true,
      equipment: true,
    },
  });
};

export const deleteRentalBooking = async (bookingId: number) => {
  const [deleted] = await db
    .update(rentalBooking)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(eq(rentalBooking.id, bookingId))
    .returning();
  return deleted;
};

export const getRentalBookingsByUserId = async (userId: number) => {
  return db.query.rentalBooking.findMany({
    where: { userId, isDeleted: false },
    with: {
      user: true,
      equipment: true,
    },
  });
};

export const getAllRentalBookings = async () => {
  return db.query.rentalBooking.findMany({
    where: { isDeleted: false },
    with: {
      user: true,
      equipment: true,
    },
  });
};

export const getPendingReminderBookings = async () => {
  return db.query.rentalBooking.findMany({
    where: {
      isDeleted: false,
      isReminderSent: false,
    },
    with: {
      user: true,
      equipment: true,
    },
  });
};

export const markReminderSent = async (bookingId: number) => {
  const [updated] = await db
    .update(rentalBooking)
    .set({ isReminderSent: true })
    .where(eq(rentalBooking.id, bookingId))
    .returning();
  return updated;
};

/**
 * Get paginated pending booking requests for admin review.
 * Bookings where status = 'requested' and isDeleted = false, with user +
 * equipment details joined, and optional search filtering.
 */
export const getPendingBookingRequests = async (
  page: number,
  limit: number,
  search?: string,
) => {
  const offset = (page - 1) * limit;

  const baseConditions = [
    eq(rentalBooking.status, "requested"),
    eq(rentalBooking.isDeleted, false),
  ];

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    const num = Number(search.trim());
    const isNum = !isNaN(num) && num > 0;

    const searchCondition = or(
      ilike(user.name, searchPattern),
      ilike(user.email, searchPattern),
      ilike(equipment.name, searchPattern),
      ...(isNum ? [eq(rentalBooking.id, num)] : []),
    );

    if (searchCondition) {
      baseConditions.push(searchCondition);
    }
  }

  const whereClause = and(...baseConditions);

  const [rawRows, totalResult] = await Promise.all([
    db
      .select({
        booking: rentalBooking,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        equipment: {
          id: equipment.id,
          name: equipment.name,
          description: equipment.description,
          price: equipment.price,
          quantity: equipment.quantity,
          imageUrl: equipment.imageUrl,
        },
      })
      .from(rentalBooking)
      .innerJoin(user, eq(rentalBooking.userId, user.id))
      .innerJoin(equipment, eq(rentalBooking.equipmentId, equipment.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(rentalBooking)
      .innerJoin(user, eq(rentalBooking.userId, user.id))
      .innerJoin(equipment, eq(rentalBooking.equipmentId, equipment.id))
      .where(whereClause),
  ]);

  const data = rawRows.map((row) => ({
    ...row.booking,
    user: row.user,
    equipment: row.equipment,
  }));

  const total = totalResult[0]?.total ?? 0;

  return { data, total };
};

/**
 * Get paginated bookings across all statuses for the admin fleet-wide
 * bookings table, with optional status filter and search (same
 * user/equipment/booking-id search as `getPendingBookingRequests`).
 */
export const getAllRentalBookingsPaginated = async (
  page: number,
  limit: number,
  search?: string,
  status?: BookingStatusFilter,
) => {
  const offset = (page - 1) * limit;

  const baseConditions = [eq(rentalBooking.isDeleted, false)];

  if (status) {
    baseConditions.push(eq(rentalBooking.status, status));
  }

  if (search && search.trim()) {
    const searchPattern = `%${search.trim()}%`;
    const num = Number(search.trim());
    const isNum = !isNaN(num) && num > 0;

    const searchCondition = or(
      ilike(user.name, searchPattern),
      ilike(user.email, searchPattern),
      ilike(equipment.name, searchPattern),
      ...(isNum ? [eq(rentalBooking.id, num)] : []),
    );

    if (searchCondition) {
      baseConditions.push(searchCondition);
    }
  }

  const whereClause = and(...baseConditions);

  const [rawRows, totalResult] = await Promise.all([
    db
      .select({
        booking: rentalBooking,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        equipment: {
          id: equipment.id,
          name: equipment.name,
          description: equipment.description,
          price: equipment.price,
          quantity: equipment.quantity,
          imageUrl: equipment.imageUrl,
        },
      })
      .from(rentalBooking)
      .innerJoin(user, eq(rentalBooking.userId, user.id))
      .innerJoin(equipment, eq(rentalBooking.equipmentId, equipment.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(rentalBooking)
      .innerJoin(user, eq(rentalBooking.userId, user.id))
      .innerJoin(equipment, eq(rentalBooking.equipmentId, equipment.id))
      .where(whereClause),
  ]);

  const data = rawRows.map((row) => ({
    ...row.booking,
    user: row.user,
    equipment: row.equipment,
  }));

  const total = totalResult[0]?.total ?? 0;

  return { data, total };
};

/**
 * Approve a booking request. Conditional WHERE guards against race
 * conditions (e.g. double-click, already processed).
 */
export const approveBooking = async (
  bookingId: number,
  tx: NodePgDatabase<any> = db,
) => {
  const [updated] = await tx
    .update(rentalBooking)
    .set({ status: "active" })
    .where(
      and(
        eq(rentalBooking.id, bookingId),
        eq(rentalBooking.status, "requested"),
        eq(rentalBooking.isDeleted, false),
      ),
    )
    .returning();
  return updated;
};

/**
 * Reject a booking request within a transaction (paired with restoring the
 * equipment stock reserved at request time). Conditional WHERE guards
 * against race conditions.
 */
export const rejectBooking = async (
  bookingId: number,
  rejectionReason: string,
  tx: NodePgDatabase<any> = db,
) => {
  const [updated] = await tx
    .update(rentalBooking)
    .set({ status: "rejected", rejectionReason })
    .where(
      and(
        eq(rentalBooking.id, bookingId),
        eq(rentalBooking.status, "requested"),
        eq(rentalBooking.isDeleted, false),
      ),
    )
    .returning();
  return updated;
};
