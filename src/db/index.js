import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
// Database connection always use async await and try catch
// This is the best practice

const connectDB=async()=>{
    try{
        const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MONGODB Connected Successfully !! DB host : ${connectionInstance.connection.host} \n`);
    }catch(error){
        console.log("MONGODB Connection Error",error);
        process.exit(1);// This will exit the process with error code 1 which means there is some error in the process 
    }

}

export default connectDB;