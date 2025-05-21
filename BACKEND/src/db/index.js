// backend/src/db/index.js



import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"; 




const connectDB = async () => {
    try {
      const connectionInstance=  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}` )
      console.log(`MongoDB connected !! DB HOST :  ${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.log("Error connecting to MongoDB:", error.message);
        process.exit(1); // Exit the process with failure
    }
}
export default connectDB;