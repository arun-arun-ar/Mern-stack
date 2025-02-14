import { Router } from "express";
import { registerUser } from "../controllers/users.controller.js";
import {upload} from "../middlewares/multer.middleware.js"

const router = Router()
//route using middleware for cover image and avatar 
router.route("/register").post( upload.fields([{name: "avatar", maxCount: 1}, {name: "coverImage", maxCount: 1}]),registerUser)


export default router;