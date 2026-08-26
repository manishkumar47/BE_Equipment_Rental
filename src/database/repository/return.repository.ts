import db from "../db-connection.js";
import { eq, and, count, ilike, or } from "drizzle-orm";
import { rentalBooking, equipment, user } from "../schema/schema.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Conditionally set status to 'return_requested'.
 * WHERE clause guards: must be the owner, status must be 'active', not soft-deleted.
 * Returns the updated row or undefined if no row matched (double-click / state change).
 */
export const requestReturn = async (bookingId: number, userId: number) => {
  const [updated] = await db
    .update(rentalBooking)
    .set({
      status: "return_requested",
      returnRequestedAt: new Date(),
      rejectionReason: null, // clear any previous rejection reason
    })
    .where(
      and(
        eq(rentalBooking.id, bookingId),
        eq(rentalBooking.userId, userId),
        eq(rentalBooking.status, "active"),
        eq(rentalBooking.isDeleted, false),
      ),
    )
    .returning();
  return updated;
};

/**
 * Get paginated pending return requests for admin review.
 * Returns bookings where status = 'return_requested' and isDeleted = false,
 * with user + equipment details joined, and optional search filtering.
 */
export const getPendingReturnRequests = async (
  page: number,
  limit: number,
  search?: string,
) => {
  const offset = (page - 1) * limit;

  const baseConditions = [
    eq(rentalBooking.status, "return_requested"),
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
 * Fetch a single booking by ID (not soft-deleted) with user + equipment.
 * Used by service layer for validation before state transitions.
 */
export const getBookingForReturn = async (bookingId: number) => {
  return db.query.rentalBooking.findFirst({
    where: { id: bookingId, isDeleted: false },
    with: {
      user: true,
      equipment: true,
    },
  });
};

/**
 * Confirm return within a transaction.
 * Conditional UPDATE WHERE status = 'return_requested' guards against race conditions.
 * Returns the updated row or undefined if already processed.
 */
export const confirmReturn = async (
  bookingId: number,
  data: {
    returnCondition: string;
    conditionNotes?: string | null | undefined;
  },
  tx: NodePgDatabase<any>,
) => {
  const [updated] = await tx
    .update(rentalBooking)
    .set({
      status: "returned",
      returnedAt: new Date(),
      returnCondition: data.returnCondition,
      conditionNotes: data.conditionNotes ?? null,
    })
    .where(
      and(
        eq(rentalBooking.id, bookingId),
        eq(rentalBooking.status, "return_requested"),
        eq(rentalBooking.isDeleted, false),
      ),
    )
    .returning();
  return updated;
};

/**
 * Restore equipment stock within a transaction.
 * Used when condition is 'good' or 'damaged' (not 'lost').
 */
export const restoreEquipmentStock = async (
  equipmentId: number,
  quantityToRestore: number,
  tx: NodePgDatabase<any>,
) => {
  // Fetch current quantity within the transaction
  const [currentEquipment] = await tx
    .select({ quantity: equipment.quantity })
    .from(equipment)
    .where(eq(equipment.id, equipmentId));

  if (!currentEquipment) return null;

  const [updated] = await tx
    .update(equipment)
    .set({ quantity: currentEquipment.quantity + quantityToRestore })
    .where(eq(equipment.id, equipmentId))
    .returning();
  return updated;
};

/**
 * Reject a return request. Reverts status to 'active', clears returnRequestedAt,
 * and stores the rejection reason.
 * Conditional WHERE guards against race conditions.
 */
export const rejectReturn = async (
  bookingId: number,
  rejectionReason: string,
) => {
  const [updated] = await db
    .update(rentalBooking)
    .set({
      status: "active",
      returnRequestedAt: null,
      rejectionReason,
    })
    .where(
      and(
        eq(rentalBooking.id, bookingId),
        eq(rentalBooking.status, "return_requested"),
        eq(rentalBooking.isDeleted, false),
      ),
    )
    .returning();
  return updated;
};
