// require('dotenv').config({path: './env'})

import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

connectDB()
.then(() => {
    app.on("error", (err) => {
        console.log("Error: ", err)
    })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port: ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("MONGODB Connection FAILED: ", error)
})


// but writing everything in index file is not the BEST approach.
/*
import express from "express"
const app = express()
// iife
;( async () => {
    try{
        await mongoose.connect(`${process.env.DATABASE_URI}/${DB_NAME}`)
        
        // in case the express app isn't able to communicate
        app.on("error", (error) => {
            console.log("ERR: ", error)
            throw error
        })

        // when app is able to communicate
        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`)
        })

    } catch(error) {
        console.error("ERROR: ", error)
        throw error
    }
})()
*/