import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { app } from "../app.js";

const registerUser = asyncHandler(async (req, res) => {
  // steps
  // 1. get user details from frontend
  // 2. validations - not empty
  // 3. check if user already exists: username, email
  // 4. check for images, check for avatar
  // 5. upload files to cloudinary, check avatar
  // 6. create user object - create entry in db
  // 7. remove pswd and refreshToken fields from response
  // 8. check for user creation
  // 9. return res

  // 1.
  const { fullName, email, username, password } = req.body;
  console.log("email: ", email);

  // 2.
  // if (fullName === "") {
  //     throw new ApiError(400, "FullName is required!")
  // } can do like this for every feild, but not the best practice

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "") // basically agar field h, and usse trim krne baad bhi voh empty h, toh true return ho jaega, yeh some method har ek element p chalega, and kisi bhi element ne agar true return kra toh mtlb voh field khaali tha - so the work is the same as writing individual if else for each field but this is a much more efficient way of writing code!
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  // email check!
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid Email Format!");
  }

  // 3.
  const existedUser = User.findOne({
    $or: [{username}, {email}] // basically inme se koi bhi agar exist krta h toh uska pehla instance (kind of ONLY instance) return ho jaega!
  })

  if (existedUser) {
    throw new ApiError(409, "Username or Email already exists!")
  }

  // 4.
  // express gives us access to req.body - similarly since we have now added multer middleware in our route - it gives us access to req.files
  const avatarLocalPath = req.files?.avatar[0]?.path // first object le rhe h kyunki agar voh mila (optionally use kr rhe h to avoid errors) toh hume uska path jo multer ne upload kra h voh mil jaega!
  const coverImageLocalPath = req.files?.coverImage[0]?.path

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required!")
  }

  // 5.
  const avatar = await uploadOnCloudinary(avatarLocalPath) // here we are getting that cloudinary url of the files that we are uploading!
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar) {
    throw new ApiError(500, "Avatar not uploaded!")
  }

  // 6.
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  }) // agar error hua toh already voh asyncHandler k catch m resolve ho jaega, uski chinta yaha krne ki zaroorat nhi h

  // 7. and 8.
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ) // user ka jo saara response aaya h, usme yeh 2 feilds select hoke nhi aaengi, by default saari selected hoti h, that's why humne minus sign k saath voh wali likhdi jo hume nhi chahiye!

  if(!createdUser) {
    throw new ApiError(500, "Something went wrong during registration!")
  }

  // 9.
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registered Successfully")
  )


}); // asyncHandler takes as input a function which in turn takes as input (req, res)

export { registerUser };
