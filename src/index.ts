import express from "express";
import { setupSwagger } from "./config/swagger.js";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";
import equipmentRouter from "./routes/equipment.route.js";
import rentalBookingRouter from "./routes/rentalBooking.route.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

app.use("/users", userRouter);
app.use("/auth", authRouter);
app.use("/equipments", equipmentRouter);
app.use("/rental-bookings", rentalBookingRouter);
setupSwagger(app);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(
    `📄 API Documentation available at http://localhost:${PORT}/api-docs`,
  );
});
