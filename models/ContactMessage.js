import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: "" },
    category: {
      type: String,
      enum: ["general", "partnership", "careers", "support"],
      default: "general",
    },
    subject: { type: String, trim: true, default: "" },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["new", "read", "resolved"],
      default: "new",
    },
  },
  { timestamps: true }
);

contactMessageSchema.index({ category: 1, status: 1 });

const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);
export default ContactMessage;