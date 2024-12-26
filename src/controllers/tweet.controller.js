import mongoose from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const MAX_TWEET_LENGTH = 280;

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  // Validate content
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  if (content.length > MAX_TWEET_LENGTH) {
    throw new ApiError(
      400,
      `Content exceeds maximum length of ${MAX_TWEET_LENGTH} characters`
    );
  }

  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized User");
  }

  const tweet = await Tweet.create({ content, owner: userId });

  res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Validate User ID
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID format");
  }

  // Retrieve user tweets with user details
  const userTweets = await Tweet.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { 
      // $unwind deconstructs an array field from the input documents to output a document for each element
      $unwind: "$userDetails" 
    }, 
    { 
      $sort: { createdAt: -1 } 
    },
    {
      $project: {
        _id: 1, // new ObjectId('') --> format
        content: 1,
        createdAt: 1,
        username: "$userDetails.username",
        email: "$userDetails.email",
      },
    },
  ]);

  console.log(userTweets);

  if (!userTweets.length) {
    throw new ApiError(404, "No tweets found for this user");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, userTweets, "User tweets retrieved successfully")
    );
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  if (content.length > MAX_TWEET_LENGTH) {
    throw new ApiError(
      400,
      `Content exceeds maximum length of ${MAX_TWEET_LENGTH} characters`
    );
  }

  if (!tweetId) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  tweet.content = content;
  const updatedTweet = await tweet.save();

  res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }

  await Tweet.findByIdAndDelete(tweetId);

  res
    .status(200)
    .json(new ApiResponse(200, { tweetId }, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
