import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import User from "./models/User.js";
import Mechanic from "./models/Mechanic.js";
import Service from "./models/Service.js";

// ids match frontend's src/data/servicesData.js exactly
const SERVICES = [
  { key: "breakdown", title: "Breakdown Repair", description: "On-spot diagnosis and repair for engine, electrical, and mechanical breakdowns.", estimatedPriceMin: 300, estimatedPriceMax: 1200, estimatedTimeMinutes: 30 },
  { key: "towing", title: "Towing", description: "Fast, safe towing to the nearest garage or your preferred location.", estimatedPriceMin: 500, estimatedPriceMax: 2000, estimatedTimeMinutes: 45 },
  { key: "battery", title: "Battery Jump-Start", description: "Dead battery? Get an instant jump-start wherever you're stranded.", estimatedPriceMin: 200, estimatedPriceMax: 600, estimatedTimeMinutes: 20 },
  { key: "tyre", title: "Flat Tyre Repair", description: "Quick tyre repair or replacement, no need to wait for a garage.", estimatedPriceMin: 250, estimatedPriceMax: 900, estimatedTimeMinutes: 25 },
  { key: "fuel", title: "Fuel Delivery", description: "Ran out of fuel? We deliver petrol or diesel straight to your location.", estimatedPriceMin: 150, estimatedPriceMax: 500, estimatedTimeMinutes: 20 },
];

// Same names/coordinates/services/pricing as frontend's
// src/data/mockMechanicsExtended.js, so results look identical once
// FindMechanic.jsx switches over to the real API.
const MECHANICS = [
  { name: "Rajesh Auto Works", email: "rajesh.autoworks@example.com", lat: 28.6139, lng: 77.209, services: ["breakdown", "battery"], pricePerVisit: 499, rating: 4.8, reviewCount: 132 },
  { name: "QuickFix Garage", email: "quickfix.garage@example.com", lat: 28.63, lng: 77.22, services: ["towing", "tyre"], pricePerVisit: 699, rating: 4.6, reviewCount: 89 },
  { name: "SpeedTow Services", email: "speedtow@example.com", lat: 28.60, lng: 77.19, services: ["towing", "fuel"], pricePerVisit: 799, rating: 4.9, reviewCount: 210 },
  { name: "City Care Mechanics", email: "citycare.mechanics@example.com", lat: 28.625, lng: 77.215, services: ["breakdown", "tyre", "battery"], pricePerVisit: 449, rating: 4.3, reviewCount: 54 },
  { name: "Highway Heroes", email: "highwayheroes@example.com", lat: 28.605, lng: 77.18, services: ["towing", "fuel", "breakdown"], pricePerVisit: 899, rating: 4.7, reviewCount: 176 },
];

// FIXED: previously there was no way for anyone to actually log into
// /admin/dashboard — Login.jsx has an Admin tab, but no account with
// role "admin" was ever seeded. This creates exactly one.
//
// Password comes from ADMIN_PASSWORD if set (recommended for production
// seeding), falling back to a known dev default only when it's unset —
// change it after first login either way.
const ADMIN = {
  name: "RoadRescue Admin",
  email: process.env.ADMIN_EMAIL || "admin@roadrescue.example",
  password: process.env.ADMIN_PASSWORD || "aryan4727",
};

const DEMO_PASSWORD = "password123";

async function seed() {
  await connectDB();

  console.log("Seeding services...");
  for (const s of SERVICES) {
    await Service.findOneAndUpdate({ key: s.key }, s, { upsert: true, new: true });
  }

  console.log(`Seeding admin account (password: ${ADMIN.password})...`);
  const existingAdmin = await User.findOne({ email: ADMIN.email });
  if (!existingAdmin) {
    await User.create({
      name: ADMIN.name,
      email: ADMIN.email,
      password: ADMIN.password,
      role: "admin",
    });
    console.log(`  - ${ADMIN.name} (${ADMIN.email})`);
  } else {
    console.log(`  - Admin already exists (${ADMIN.email})`);
  }

  console.log(`Seeding demo mechanics (password for all: ${DEMO_PASSWORD})...`);
  for (const m of MECHANICS) {
    let user = await User.findOne({ email: m.email });
    if (!user) {
      user = await User.create({
        name: m.name,
        email: m.email,
        password: DEMO_PASSWORD,
        role: "mechanic",
      });
    }

    await Mechanic.findOneAndUpdate(
      { user: user._id },
      {
        user: user._id,
        services: m.services,
        pricePerVisit: m.pricePerVisit,
        location: { lat: m.lat, lng: m.lng },
        isOnline: true,
        verification: { status: "Approved", reviewedAt: new Date() },
        rating: m.rating,
        reviewCount: m.reviewCount,
      },
      { upsert: true, new: true }
    );
    console.log(`  - ${m.name} (${m.email})`);
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});