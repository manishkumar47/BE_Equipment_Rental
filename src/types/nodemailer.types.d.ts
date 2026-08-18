export type BookingEmailProps = {
    user: {
        name: string;
        email: string;
    };
    equipment: {
        name: string;
        description?: string | null;
        price: number;
    };
    booking: {
        id: number;
        quantity: number;
        rentFrom: Date;
        rentTo: Date;
    };
};
//# sourceMappingURL=nodemailer.types.d.ts.map