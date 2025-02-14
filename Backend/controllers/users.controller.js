import asyncHandler from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../models/users.model.js";
import { uploadFileOnCloudinary } from "../utils/cloudinary.fileupload.js";
import { apiResponse } from "../utils/apiResponse.js";


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
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

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

export { registerUser };
