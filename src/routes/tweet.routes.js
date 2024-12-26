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
router.route("/getUserTweets/:userId").get(verifyJWT,getUserTweets);
router.route("/updateTweet/:tweetId").patch(verifyJWT, updateTweet);
router.route("/deleteTweet/:tweetId").delete(verifyJWT, deleteTweet);

export default router;
