import dotenv from "dotenv";
dotenv.config();

import http from "http";
import connectDB from "./config/db.js";
import app from "./app.js";
import { initSocket } from "./utils/socket.js";

const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

// Socket.IO needs the raw http server (not the Express app directly) so
// it can upgrade connections to WebSockets alongside normal HTTP requests.
const httpServer = http.createServer(app);
initSocket(httpServer, allowedOrigins);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`RoadRescue API (HTTP + WebSocket) running on port ${PORT}`);
  });
});