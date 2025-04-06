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

export { app }