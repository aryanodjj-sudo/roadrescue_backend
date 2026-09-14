import Subscription from "../models/Subscription.js";

export async function getActiveSubscription(userId) {
  return Subscription.findOne({
    user: userId,
    status: "active",
    endDate: { $gte: new Date() },
  }).sort({ endDate: -1 });
}