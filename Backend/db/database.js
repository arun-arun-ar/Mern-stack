import mongoose from "mongoose";

const connectDB = async () => { 
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/vidapp`)

        console.log("MongoDB Connected succesfully");
        
    } catch (error) {
        console.log("Error", error)
    }
 }

 export default connectDB;