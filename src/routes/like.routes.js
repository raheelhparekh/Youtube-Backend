import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
} from "../controllers/like.controller.js";

const router = Router();

// Video-related routes
router.post("/videos/:videoId/like", verifyJWT, toggleVideoLike);
router.get("/videos/liked", verifyJWT, getLikedVideos);

// Comment-related routes
router.post("/comments/:commentId/like", verifyJWT, toggleCommentLike);

// Tweet-related routes
router.post("/tweets/:tweetId/like", verifyJWT, toggleTweetLike);

export default router;