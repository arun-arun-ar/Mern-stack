import mongoose from "mongoose";


//database connection
const connectDB = async () => { 
    try {
        //connection string
        await mongoose.connect(`${process.env.MONGODB_URL}/vidapp`)

        console.log("MongoDB Connected succesfully");
        
    } catch (error) {
        console.log("Error", error)
    }
 }


 //export database connection
 export default connectDB;