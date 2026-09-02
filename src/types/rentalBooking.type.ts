export type CreateRentalBookingObject = {
  userId: number;
  equipmentId: number;
  rentTo: Date;
  rentFrom: Date;
  quantity: number;
};

export type RentalBooking = {
  id: number;
  userId: number;
  equipmentId: number;
  rentTo: Date;
  rentFrom: Date;
  quantity: number;
};

export type RentalBookingItemCondition = "good" | "damaged" | "lost";

export type ReturnItemDecision = {
  equipmentItemId: number;
  condition: RentalBookingItemCondition;
  damageFee?: number;
};
