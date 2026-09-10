import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import mechanicRoutes from "./routes/mechanicRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import serviceRequestRoutes from "./routes/serviceRequestRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

// Standard security headers (HSTS, no-sniff, frame protections, etc.).
// crossOriginResourcePolicy is relaxed to cross-origin since this is a
// pure JSON API consumed from a different frontend origin.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "RoadRescue API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/mechanics", mechanicRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;