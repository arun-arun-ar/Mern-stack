import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../models/users.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.fileupload.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";


//methods to generate refresh and access tokens 
//this medhod will find useer form ther id and generates access token and refresh token  then it saces refresht token to database 
const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //adding refreshtoekn of a user in database and save it 
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new apiError(500, "Something went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // Extract user data from request body
    const { username, email, fullname, password } = req.body;

    // Validate required fields (trims extra spaces and checks for empty values)
    if ([username, email, fullname, password].some((field) => field?.trim() === "")) {
        throw new apiError(400, "All fields are required.");
    }

    // Check if the user already exists using the email
    const existingUser = await User.findOne({ email });

    // If email is already registered, throw an error
    if (existingUser) {
        throw new apiError(409, "Email already exists.");
    }

    // Retrieve file paths for avatar and cover image (if provided)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let coverImageLocalPath;
    if (req.file && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // Ensure the avatar image is provided
    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar is required.");
    }

    // Upload avatar image to Cloudinary
    const avatar = await uploadFileOnCloudinary(avatarLocalPath);

    // Upload cover image to Cloudinary (only if provided)
    const coverImage = coverImageLocalPath ? await uploadFileOnCloudinary(coverImageLocalPath) : null;

    // Ensure avatar upload was successful
    if (!avatar) {
        throw new apiError(400, "Error uploading avatar.");
    }

    // Create a new user in the database
    const user = await User.create({
        username: username.toLowerCase(),  // Store username in lowercase
        email,
        fullname,
        avatar: avatar.url,  // Store avatar URL from Cloudinary
        coverImage: coverImage?.url || "",  // Store cover image URL or empty string if not provided
        password,
    });

    // Retrieve the newly created user without password & refreshToken fields
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // Ensure user creation was successful
    if (!createdUser) {
        throw new apiError(500, "Something went wrong while registering a new user.");
    }

    // Send success response
    return res.status(201).json(
        new apiResponse(201, createdUser, "User registered successfully.")
    );
});


//user login

const loginUser = asyncHandler(async (req, res) => {

    //retriving data from user 
    //const { email, username, password } = req.body;
    const { email, password } = req.body;

    // || this refers to 'or'
    // if (!username || !email) {
    //     throw new apiError(400, "Username or Password is Required");
    // }

    //logging in user form email only
    if (!email) {
        throw new apiError(400, "Email and password are required")
    }

    //$or is an mongodb operator 
    //find if username or email is existing in database or not 
    // const user = await User.findOne({
    //     $or: [{ username }, { email }]
    // })

    //find if email is exist or not in database
    const user = await User.findOne({ email })

    //throw an error if the username or password didnt match 
    if (!user) {
        throw new apiError(404, "User doesn't exist")

    }
    console.log(email);
    console.log(password);


    //validate user password 
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new apiError(401, "Please Provide a Vallid Password.")
    }

    //calling the method generateAccessAndRefereshTokens
    const { refreshToken, accessToken } = await generateAccessAndRefereshTokens(user._id);

    const loginUser = await User.findById(user._id).select("-password -refreshToken")

    // cookies
    const options = {
        httpOnly: true,
        secure: true
    }


    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new apiResponse(200, { user: loginUser, accessToken, refreshToken }, "User loggined Succesfully"))



})

//user logout
const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }



    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "User logged out succesfully"))

})


const refreshAccessToken = asyncHandler(async (rea, res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incommingRefreshToken) {
        throw new apiError(401, "Unauothorize request")
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFERESH_TOKEN_SECRET,
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new apiError(401, "Invalid refresh token")
        }


        if (incommingRefreshToken !== user?.refreshToken) {
            throw new apiError(401, "Refresh token is expired or used ")
        }

        const options = {
            httpOnly: true,
            secure: true,
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200).cookie("accessToken", accessToken, options).
            cookie("refreshToken", newRefreshToken, options)
            .json(
                new apiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Accessed token refreshed succesfully")
            )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid Refresh Token")
    }
})

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;


    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new apiError(400, " Incorrect previous password")
    }

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new apiResponse(200, {}, " Password changed succesfully "))

})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(200, req.user, "current user fetched succesfully")
})


const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullname, email, } = req.body;

    if (!fullname || !email) {
        throw new apiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        { new: true }
    ).select("-password")

    res.status(200)
        .json(new apiResponse(200), user, "User Details updated succesfully")

})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.path

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar is required")
    }

    const avatar = await uploadFileOnCloudinary(avatarLocalPath)


    if (!avatar.url) {
        throw new apiError(400, "error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")
    return res.status(200)
    .json(new apiResponse(200, user, "avatar is updated succesfully"))
})


const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.files?.path

    if (!coverImageLocalPath) {
        throw new apiError(400, "Cover Image is required")
    }

    const coverImage = await uploadFileOnCloudinary(coverImageLocalPath)


    if (!coverImage.url) {
        throw new apiError(400, "error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
    .json(new apiResponse(200, user, "Cover image updatesd succesfully"))
})

export { registerUser, loginUser, logout, refreshAccessToken, changePassword, getCurrentUser, updateUserDetails, updateUserAvatar, updateCoverImage };



