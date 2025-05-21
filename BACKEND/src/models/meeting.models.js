// src/models/meeting.models.js

import mongoose, { Schema } from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const meetingSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    
    meetingCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },


    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        joinTime: Date,
        exitTime: Date,
      },
    ],

    // ─── Chat messages persistence ────────────────────────────
    messages: [
      {
        sender: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

meetingSchema.plugin(mongooseAggregatePaginate);

export const Meeting = mongoose.model('Meeting', meetingSchema);
