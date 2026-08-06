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
