import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// import { app } from "../app.js";
import jwt from "jsonwebtoken";
import mongoose, { mongo } from "mongoose";
// import { syncIndexes } from "mongoose";

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
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // (not sure of this comment) fileS isilye likha h kyunki humne 2 fields set kiye h na - avatar and coverImage wala - otherwise file likhte toh bhi chalta?
  // first object le rhe h kyunki agar voh mila (optionally use kr rhe h to avoid errors) toh hume uska path jo multer ne upload kra h voh mil jaega!
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
      $unset: {
        refreshToken: 1, // this removes the field from the document
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

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

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
    throw new ApiError(401, error?.message || "Invalid Refresh Token!");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Old Password!");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched Successfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // what all details you let the user change depends on you - the developer!
  // if you're letting them change any FILE - try to keep a separate controller!
  const { fullName, email } = req.body; // req.body se le rhe h - req.body m hum data bhejte h (like during API Testing, we send through POSTMAN, then when the full stack is developed, it comes from frontend!)
  if (!fullName || !email) {
    throw new ApiError(400, "All Fields are Required!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      // here we use MONGODB operators
      $set: {
        fullName: fullName, // aise bhi set kr skte h
        email: email,
        // and aise bhi - only fullName, email likhke chhod do!
      },
    },
    { new: true } // this will return the user with the updated new details!
  ).select("-password"); // agar yah nhi krte select, toh ek aur user._id krke query hit krte DB ko and then vaha se phir select krke remove kr dete pswd ko

  return res
    .status(200)
    .json(
      new ApiResponse(200, req.user, "Account Details Updated Successfully!")
    );
}); // this was updating TEXT-BASED details!

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; // through MULTER middleware

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar File is Missing!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading Avatar!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path; // through MULTER middleware

  if (!avatarLocalPath) {
    throw new ApiError(400, "Cover Image File is Missing!");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(500, "Something went wrong while uploading Avatar!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Updated Successfully!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params; // because we will get data from the url - jaha bhi yeh channel hume milega jis route p, uske params se data milega hume

  if (!username?.trim()) {
    throw new ApiError(400, "UserName is Missing!");
  }

  // now we could have done like this ki
  // User.find({username}) but problem yeh h ki yaha p hum pehle database se user lenge poora, phir uski id k basis p aggregation lgaenge - which is unnecessary - we can do it directly since aggregation SAARE DOCUMENTS M SE HAMARI NEEDS KO MATCH {$match} krke de dega!

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // pipeline for finding subscribers!
      $lookup: {
        from: "subscriptions", // model save hote time everything gets converted to lower case and becomes plural as well
        localField: "_id",
        foreignField: "channel", // basically this will help us in getting all the SUBSCRIBERS of a channel
        as: "subscribers",
      },
    },
    {
      // pipeline for finding subscribers!
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber", // basically this will help us in getting all the CHANNELS a user has subscribed to
        as: "subscribedTo",
      },
    },
    {
      // count pipeline
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          // to check whether a user (current) is subscribed to a channel or not!
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] }, // yeh dkhna h ki jo subscribers document aaya h, usme current user h ya nhi for that particular channel!
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        // we'll not project all the values that rae demanded, we'll give selected values
        fullName: 1, // jin jin ko bhi project krna h, uske aage 1 lga doooo
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]); // aggregate takes an array, and then we write pipelines in it in the form of objects!
  // the value that is returned from aggregation pipelines are Arrays!
  console.log(channel); // just to know what aggregate return!

  if (!channel?.length) {
    throw new ApiError(404, "Channel doesn't Exist!!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel Fetched Successfully!")
    ); // channel[0] means the first OBJECT (because channel is an array of objects - in our case it most probably HAS ONLY 1 OBJECT AT channel[0])
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id), // actually jo MONGODB m _id hoti h that is -> ObjectId('somestring') - ab mongoose jb kaam krta h, toh hume _id m seedha yeh string return kr deta h, thats why we don't have to take care of this - mongoose khud dkh leta h - but in this case of aggregation pipeline, mongoose doesn't really work, that's why we have to handle it right now!
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [ 
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              // why this pipeline? -> (maybe) so that we don't have to give/show/project ALL THE DETAILS OF THIS "OWNER"
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          { // array return krne ki jagah seedha hi yeh addFields kr liya so that ab frontend p bss yeh field. krke mil jaega data, varna first object m se lena pdta array k and all...
            $addFields: {
              owner: { // owner ki exsiting feild ko hi overwrite krwa rhe h - doosre naam ki field bana k usse add bhi kr skte thhey
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ]);

  return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch History Fetched Successfully!"))
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
