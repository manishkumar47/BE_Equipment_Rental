import type { CreateRentalBookingObject } from "./rentalBooking.type.js";
export declare const createRentalBooking: (createRentalBookingObject: CreateRentalBookingObject) => Promise<{
    id: number;
    quantity: number;
    deletedAt: Date | null;
    isDeleted: boolean;
    userId: number;
    rentFrom: Date;
    rentTo: Date;
    equipmentId: number;
    isReminderSent: boolean;
    equipment: {
        id: number;
        name: string;
        description: string | null;
        quantity: number;
        price: number;
        createdAt: Date;
        deletedAt: Date | null;
        isDeleted: boolean;
    } | null;
    user: {
        role: "USER" | "ADMIN";
        id: number;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        isDeleted: boolean;
        email: string;
        password: string;
    } | null;
} | undefined>;
export declare const getRentalBookingById: (bookingId: number) => Promise<{
    id: number;
    quantity: number;
    deletedAt: Date | null;
    isDeleted: boolean;
    userId: number;
    rentFrom: Date;
    rentTo: Date;
    equipmentId: number;
    isReminderSent: boolean;
    equipment: {
        id: number;
        name: string;
        description: string | null;
        quantity: number;
        price: number;
        createdAt: Date;
        deletedAt: Date | null;
        isDeleted: boolean;
    } | null;
    user: {
        role: "USER" | "ADMIN";
        id: number;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        isDeleted: boolean;
        email: string;
        password: string;
    } | null;
} | undefined>;
export declare const deleteRentalBooking: (bookingId: number) => Promise<{
    id: number;
    rentFrom: Date;
    rentTo: Date;
    userId: number;
    equipmentId: number;
    quantity: number;
    deletedAt: Date | null;
    isDeleted: boolean;
    isReminderSent: boolean;
} | undefined>;
export declare const getAllRentalBookings: () => Promise<{
    id: number;
    quantity: number;
    deletedAt: Date | null;
    isDeleted: boolean;
    userId: number;
    rentFrom: Date;
    rentTo: Date;
    equipmentId: number;
    isReminderSent: boolean;
    equipment: {
        id: number;
        name: string;
        description: string | null;
        quantity: number;
        price: number;
        createdAt: Date;
        deletedAt: Date | null;
        isDeleted: boolean;
    } | null;
    user: {
        role: "USER" | "ADMIN";
        id: number;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        isDeleted: boolean;
        email: string;
        password: string;
    } | null;
}[]>;
export declare const getPendingReminderBookings: () => Promise<{
    id: number;
    quantity: number;
    deletedAt: Date | null;
    isDeleted: boolean;
    userId: number;
    rentFrom: Date;
    rentTo: Date;
    equipmentId: number;
    isReminderSent: boolean;
    equipment: {
        id: number;
        name: string;
        description: string | null;
        quantity: number;
        price: number;
        createdAt: Date;
        deletedAt: Date | null;
        isDeleted: boolean;
    } | null;
    user: {
        role: "USER" | "ADMIN";
        id: number;
        name: string;
        createdAt: Date;
        deletedAt: Date | null;
        isDeleted: boolean;
        email: string;
        password: string;
    } | null;
}[]>;
export declare const markReminderSent: (bookingId: number) => Promise<{
    id: number;
    rentFrom: Date;
    rentTo: Date;
    userId: number;
    equipmentId: number;
    quantity: number;
    deletedAt: Date | null;
    isDeleted: boolean;
    isReminderSent: boolean;
} | undefined>;
//# sourceMappingURL=rentalBooking.repository.d.ts.map