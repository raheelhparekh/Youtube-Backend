import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();


// MIDDLEWARES 
// middlewares is used via app.use
// cors is used to allow the request from different origin to access the api
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

//  ***  middleware setting to check kitna data aa rha he aur kya aa rha he. keeping limits ***

app.use(express.json({limit: '16kb'})); // json data aata hai form se toh uspe limit laga diya

app.use(express.urlencoded({extended: true,limit:'16kb'})); // url se data aata hai toh usse parse karne ke liye

app.use(express.static('public')); // public folder pdf folders vagera ko static folder bana diya

app.use(cookieParser()); // cookies access karna and cookies set karna ke liye

//routes import
import userRouter from './routes/user.routes.js';



//routes declaration
app.use('/api/v1/users', userRouter);  // http://localhost:3000/api/v1/users/register

export {app}