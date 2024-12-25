import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
} from "../controllers/tweet.controller.js";

const router = Router();

router.route("/create-tweet").post(verifyJWT, createTweet);
router.route("/c/:userId").get(verifyJWT,getUserTweets);
router.route("/c/:tweetId").patch(verifyJWT, updateTweet);
router.route("/c/:tweetId").delete(verifyJWT, deleteTweet);

export default router;
