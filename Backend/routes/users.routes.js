import { Router } from "express";
import { registerUser,loginUser, logout, refreshAccessToken } from "../controllers/users.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()
//route using middleware for cover image and avatar 
router.route("/register").post( upload.fields([{name: "avatar", maxCount: 1}, {name: "coverImage", maxCount: 1}]),registerUser)

router.route("/login").post(loginUser)

//secured routes i.e. without login user cannot logout
router.route("/logout").post(verifyJWT,logout)
router.route("/refresh-token").post(refreshAccessToken)

export default router;