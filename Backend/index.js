//importing pakages and libs
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// importing form project
import connectDB from './db/database.js';

//dotenv configuration
dotenv.config()

//express app
const app = express();

//database connection
connectDB()


//middlewares 

// cors configuration
app.use(cors())


//json config using express 
app.use(express.json({limit: "16kb"}))

//encode url using express
app.use(express.urlencoded({extended: true, limit: "16kb"}))

//static resources congiguratin
app.use(express.static("public"))

//config cookie-parser
app.use(cookieParser())

app.get("/", ()=>{
    res.send("Hello World!");
})

app.listen(process.env.PORT || 8000, () => { 
    console.log(`The app is listening at port ${process.env.PORT}`);
    
 })