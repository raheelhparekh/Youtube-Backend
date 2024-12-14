import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middlewares.js'


const router=Router();

// SYNTAX : router.route("/register").post(registerUser) --> this registerUser is from user.controller.js

router.route("/register").post(

    // this is a middleware which is coming from multer.middlewares.js
    // isse we can now send images
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser)
router.route("/login").post(registerUser)

export default router;