// with promises
const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((error) => next(error))
    }
}

export { asyncHandler }




// with try catch

// // const asyncHandler = (fn) = {() => {}}

// //this is basically the same as the above line - JS has higher order functions!
// const asyncHandler = (fn) = async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         // sending an error - either error k andar response code aa jaega ya phir hum 500 / 400 aisa kuchh bhej dete h
//         // futhermore status toh bhej diya but we also send a json response which contains a success flag and an error message
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }
// export { asyncHandler }