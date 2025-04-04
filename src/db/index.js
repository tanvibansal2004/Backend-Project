import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.DATABASE_URI}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB connected! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("MONGODB Connection FAILED: ", error);
    // throw error
    process.exit(1);
  }
};

export default connectDB;
