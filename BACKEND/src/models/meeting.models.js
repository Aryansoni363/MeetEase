import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import crypto from "crypto";

const meetingSchema = new mongoose.Schema({
  // Internal lookup ID (UUID)
  roomId: {
    type: String,
    required: true,
    unique: true,
  },

  // Public share-able code (10 hex chars)
  meetingCode: {
    type: String,
    required: true,
    unique: true,
  },

  host: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  participants: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      joinTime: { type: Date },
      exitTime: { type: Date },
    }
  ],

  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  }
}, {
  timestamps: true,
});

// Generate a unique meetingCode before validation
meetingSchema.pre("validate", async function(next) {
  if (!this.meetingCode) {
    let unique = false;
    while (!unique) {
      // 5 random bytes → 10 hex characters
      const code = crypto.randomBytes(5).toString("hex");
      const exists = await mongoose.model("Meeting").findOne({ meetingCode: code });
      if (!exists) {
        this.meetingCode = code;
        unique = true;
      }
    }
  }
  next();
});

meetingSchema.plugin(mongooseAggregatePaginate);

export const Meeting = mongoose.model("Meeting", meetingSchema);
