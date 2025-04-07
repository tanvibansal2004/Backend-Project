import express from "express";
import cookieParser from "cookie-parser";
import cors from 'cors'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// how to handle the data that our backend will get.

// when we get data from some form.
app.use(express.json({limit: "16kb"}))
// when we get data from a URL
app.use(express.urlencoded({extended: true, limit: "16kb"}))
// when we want to store some files or folder like pdfs, images, favicons
app.use(express.static("public"))
// secure cookies of user's browser
app.use(cookieParser())



// routes import
import userRouter from './routes/user.routes.js'


// routes declaration

// earlier we could write things like -> app.get() -> because we were making the routes and controllers over here only with the app, but now we've separated stuff therefore, NOW, to bring router, we will have to bring a middleware -> compulsory syntax
// app.use("/users", userRouter) // as soon as somebody types /users now, we will give control to userRouter and then it will follow what is written there is that userRouter file!

// so basically if you look at the user.routes.js file, there we have made the /register route and here it is /users, and we will get a URL like this -> http://localhost:8000/users/register -> iss file wala route prefix ban jata h!
// agar vaha p /login wala bhi ek route hua, toh ek URL aur hume mil jaega -> http://localhost:8000/users/login -> we don't make any changes over here in app.js

// better practice is to define API and its versions
app.use("/api/v1/users", userRouter)
// http://localhost:8000/api/v1/users/register


export { app }