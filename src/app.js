import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: '16kb'})); // json data aata hai toh usse parse karne ke liye
app.use(express.urlencoded({extended: true})); // url se data aata hai toh usse parse karne ke liye
app.use(express.static('public')); // public folder pdf folders vagera ko static folder bana diya
app.use(cookieParser());


export {app}