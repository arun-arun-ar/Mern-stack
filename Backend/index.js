import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db/database.js';

dotenv.config()


const app = express();
connectDB()

app.get("/", ()=>{
    res.send("Hello World!");
})

app.listen(process.env.PORT, () => { 
    console.log(`The app is listening at port ${process.env.PORT}`);
    
 })