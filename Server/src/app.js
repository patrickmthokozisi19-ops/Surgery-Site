
import express from "express";
import appointmentRoutes from "./routes/appointments.routes.js";

const app = express();

// Middleware
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "Pweb API is running successfully"
  });
});

// Appointment routes
app.use("/api/appointments", appointmentRoutes);

export default app;
