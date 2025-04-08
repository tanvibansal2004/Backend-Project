import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// import { app } from "../app.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId); // this user is an object only of our DB
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken(); // now we have generated both tokens, but we also need to store the refresh token in our DB

    user.refreshToken = refreshToken; // saved refresh token in our DB
    await user.save({
      validateBeforeSave: false,
    }); // because pswd toh hi nhi, sirf ek hi feild daalke/update krke save krwa rhe h, so for that we are using this validateBeforeSave: false

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Refresh and Access Tokens!"
    );
  }
};

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
  console.log(req.body);
  // console.log("email: ", email);

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
  const existedUser = await User.findOne({
    $or: [{ username }, { email }], // basically inme se koi bhi agar exist krta h toh uska pehla instance (kind of ONLY instance) return ho jaega!
  });

  if (existedUser) {
    throw new ApiError(409, "Username or Email already exists!");
  }

  // 4.
  // express gives us access to req.body - similarly since we have now added multer middleware in our route - it gives us access to req.files
  console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path; // first object le rhe h kyunki agar voh mila (optionally use kr rhe h to avoid errors) toh hume uska path jo multer ne upload kra h voh mil jaega!
  // const coverImageLocalPath = req.files?.coverImage[0]?.path

  // to resolve scope issues of coverImageLocalPath
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required!");
  }

  // 5.
  const avatar = await uploadOnCloudinary(avatarLocalPath); // here we are getting that cloudinary url of the files that we are uploading!
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Avatar not uploaded!");
  }

  // 6.
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  }); // agar error hua toh already voh asyncHandler k catch m resolve ho jaega, uski chinta yaha krne ki zaroorat nhi h

  // 7. and 8.
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); // user ka jo saara response aaya h, usme yeh 2 feilds select hoke nhi aaengi, by default saari selected hoti h, that's why humne minus sign k saath voh wali likhdi jo hume nhi chahiye!

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong during registration!");
  }

  // 9.
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully!"));
}); // asyncHandler takes as input a function which in turn takes as input (req, res)

const loginUser = asyncHandler(async (req, res) => {
  // 1. req.body -> data
  // 2. username or email based login
  // 3. find the user
  // 4. check pswd
  // 5. access and refresh token
  // 6. send through cookies

  // 1.
  const { email, username, password } = req.body;

  // 2.
  if (!(username || email)) {
    throw new ApiError(400, "Username or Email is required!");
  }

  // 3.
  const user = await User.findOne({
    $or: [{ username }, { email }], // either we find the username or we find the email, return the first instance
  });

  if (!user) {
    throw new ApiError(404, "User doesn't exist! Register Now!");
  }

  // 4.
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials!");
  }

  // 5.
  // very common, will be used many times, therefore making a method for this
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // 6.
  // we shouldn't send this "user" directly to our user because it  contains some unwanted fields also like pswd, which we shouldn't send to the user and like iss user m jo refresh token pada h voh empty h because humne reference pehle le liya the user m, and method for refresh token baadme call hua h na
  // now here we should decide whether firing another DB query will be an expensive operation or not - if not, make a DB query - if yes, simply update this object only
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // for cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken, // when we have already set these tokens as cookies, then what is the need to send them separately as well -> handling the case when it might be possible that the user is trying to save these tokens themselves
        },
        "User Logged In Successfully!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // 1. clear all cookies
  // 2. reset the refresh token also (remove it)

  // now we basically want our object but HOW TO ACCESS? - we dont have any id, or email or username or stuff like that to access into the DB - so we will try and design OUR OWN MIDDLEWARE THAT CAN MAYBE HANDLE THIS KIND OF SITUATION!!

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true, // jb resposne return hoga toh new values milengi
    }
  );

  // for cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request!");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  
    const user = await User.findById(decodedToken?._id);
  
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token!");
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used!");
    }
  
    const options = {
      httpOnly: true,
      secure: true,
    };
  
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );
  
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed Successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token!")
  }
});

export { registerUser, loginUser, logoutUser , refreshAccessToken };
