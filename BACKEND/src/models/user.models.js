import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: [true, 'Passwor is required'] },
    meetingHistory: [
      {
        meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting' },
      }
    ],
    refreshToken: { type: String,  },


  },  
  { timestamps: true }
); 

// Pre-save hook to hash the password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
 
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  
});
userSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
}
userSchema.methods.generateAccessToken = function () {
  return jwt.sign({ _id: this._id, username: this.username, email: this.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
}

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });
};



export const User = mongoose.model('User', userSchema);
