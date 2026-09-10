import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import ServiceRequest from "../models/ServiceRequest.js";
import { isValidCoord } from "./validateCoords.js";

// Single shared io instance — controllers import emitToUser() to push
// real-time events without needing a circular import of server.js.
let io = null;

// Minimum time between accepted location updates for the same request,
// per socket. Keeps a single mechanic's watchPosition callbacks from
// flooding every viewer's room even if the client-side throttle is
// bypassed or misbehaves. Matches the client's own watchPosition
// maximumAge, just enforced here too since the client can't be trusted.
const LOCATION_MIN_INTERVAL_MS = 2000;

export function initSocket(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Every socket must present the same JWT used for REST auth. No token,
  // no connection — mirrors middleware/authMiddleware.js's `protect`.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Not authorized, no token provided"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Not authorized, token invalid or expired"));
    }
  });

  io.on("connection", (socket) => {
    // Every connected user gets a personal room — emitToUser() targets
    // this directly, so a user can have multiple tabs/devices open and
    // all of them receive the same event.
    socket.join(`user:${socket.userId}`);

    // requestId -> "customer" | "mechanic", only for rooms THIS socket has
    // actually been authorized into. mechanic:location checks against this
    // instead of hitting the DB on every single GPS tick.
    const authorizedRequests = new Map();
    // requestId -> last accepted location-update timestamp, for rate limiting.
    const lastLocationAt = new Map();

    // A customer viewing TrackService (or a mechanic on an active job)
    // joins the specific request's room so mechanic location updates
    // only reach people actually watching that one request. Only the
    // request's own customer or its accepted mechanic may join —
    // otherwise any logged-in user could watch anyone else's job.
    socket.on("request:join", async (requestId) => {
      if (typeof requestId !== "string") return;

      try {
        const request = await ServiceRequest.findById(requestId).select(
          "user acceptedBy"
        );
        if (!request) return;

        const isCustomer = request.user.toString() === socket.userId;
        const isAcceptedMechanic =
          request.acceptedBy && request.acceptedBy.toString() === socket.userId;

        if (!isCustomer && !isAcceptedMechanic) return;

        authorizedRequests.set(requestId, isCustomer ? "customer" : "mechanic");
        socket.join(`request:${requestId}`);
      } catch {
        // Invalid id or DB hiccup — just don't join. No details leaked back.
      }
    });

    socket.on("request:leave", (requestId) => {
      if (typeof requestId !== "string") return;
      authorizedRequests.delete(requestId);
      lastLocationAt.delete(requestId);
      socket.leave(`request:${requestId}`);
    });

    // Mechanic's live position while working an active job — relayed
    // only to whoever is watching that specific request. Only accepted
    // via a socket that's authorized into this room as the mechanic
    // (i.e. actually request.acceptedBy), so a customer or an unrelated
    // mechanic can never spoof another job's location.
    socket.on("mechanic:location", ({ requestId, lat, lng }) => {
      if (typeof requestId !== "string") return;
      if (authorizedRequests.get(requestId) !== "mechanic") return;
      if (!isValidCoord(lat, lng)) return;

      const now = Date.now();
      const last = lastLocationAt.get(requestId) || 0;
      if (now - last < LOCATION_MIN_INTERVAL_MS) return;
      lastLocationAt.set(requestId, now);

      io.to(`request:${requestId}`).emit("mechanic:location", {
        requestId,
        lat,
        lng,
        at: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      authorizedRequests.clear();
      lastLocationAt.clear();
    });
  });

  return io;
}

// Pushes an event to every socket connection belonging to one user
// (all their open tabs/devices). Safe to call even if a user has no
// active socket connection — Socket.IO just no-ops in that case.
export function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId.toString()}`).emit(event, payload);
}