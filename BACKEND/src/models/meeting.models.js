import mongoose ,{Schema} from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

// Purpose: This schema is designed to manage meeting rooms for a video conferencing app.
// It tracks the host, participants, meeting start and end times, and user join/exit times.

const meetingSchema = new mongoose.Schema(
    {
    roomId: {
        type: String,
        required: true,
        unique: true, // Ensures each meeting room has a unique identifier
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model for the host
        required: true,
    },
    participants: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', // Reference to the User model for participants
            },
            joinTime: {
                type: Date, // Tracks when the user joined the meeting
            },
            exitTime: {
                type: Date, // Tracks when the user exited the meeting
            },
            //how can i  check the total no  of participants in the meeting room
        },
    ],
    startTime: {
        type: Date, // The time when the meeting started
        required: true,
    },
    endTime: {
        type: Date, // The time when the meeting ended
    },
    createdAt: {
        type: Date,
        default: Date.now, // Automatically sets the creation time of the meeting
    },
    updatedAt: {
        type: Date,
    },
    // i want to add recording of the meeting in the future using cloudinary
    // recording: {
    //     type: String, // URL or path to the recorded meeting
    // },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
}
);

meetingSchema.plugin(mongooseAggregatePaginate); // Adds pagination capabilities to the schema

export const Meeting = mongoose.model('Meeting', meetingSchema);


