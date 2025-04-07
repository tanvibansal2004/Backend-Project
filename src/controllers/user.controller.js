import {asyncHandler} from "../utils/asyncHandler.js"

const registerUser = asyncHandler(async (req, res) => {
    res.status(400).json({
        message: "hahaha"
    })
}) // asyncHandler takes as input a function which in turn takes as input (req, res)

export { registerUser }