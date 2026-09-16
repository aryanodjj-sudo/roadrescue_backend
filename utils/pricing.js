// Authoritative Fuel Delivery pricing — computed server-side so a
// tampered/spoofed price from the client is never trusted. Keep these
// numbers in sync with the frontend's src/data/servicesData.js (used
// there only to show a live preview before booking).
export const FUEL_PRICES = { petrol: 105, diesel: 100 }; // Rs per litre
export const FUEL_FREE_DELIVERY_LITRES = 5; // 5L or more => free delivery
export const FUEL_DELIVERY_CHARGE = 100; // Rs, flat, waived at/above the litres above

export function calculateFuelBill(fuelType, litres) {
  const rate = FUEL_PRICES[fuelType];
  const qty = Number(litres);
  if (!rate || !qty || qty <= 0) return null;

  const fuelCost = Math.round(rate * qty);
  const deliveryCharge = qty >= FUEL_FREE_DELIVERY_LITRES ? 0 : FUEL_DELIVERY_CHARGE;
  return { rate, fuelCost, deliveryCharge, total: fuelCost + deliveryCharge };
}