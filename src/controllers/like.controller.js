import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // toggle like on video
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const like = await Like.findOne({ video: videoId, likedBy: req.user._id });
  if (!like) {
    await Like.create({ video: videoId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, null, "Video liked"));
  } else {
    await Like.deleteOne({ video: videoId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, null, "Video unliked"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  // toggle like on comment
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  const like = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });
  if (!like) {
    await Like.create({ comment: commentId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, null, "Comment liked"));
  } else {
    await Like.deleteOne({ comment: commentId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, null, "Comment unliked"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  // toggle like on tweet
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "tweet not found");
  }
  const like = await Like.findOne({ tweet: tweetId, likedBy: req.user._id });
  if (!like) {
    await Like.create({ tweet: tweetId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, null, "tweet liked"));
  } else {
    await Like.deleteOne({ tweet: tweetId, likedBy: req.user._id });
    return res.status(200).json(new ApiResponse(200, null, "tweet unliked"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  // get all liked videos
  // Ensure the user is authenticated
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "Unauthorized");
  }

  // Find all likes associated with videos and the logged-in user
  const likedVideos = await Like.find({
    likedBy: req.user._id,
    video: { $exists: true },
  })
    .populate("video") // Populate the video details
    .exec();

  // If no liked videos are found
  if (likedVideos.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No liked videos found"));
  }

  // Map through the results to extract video details
  const videos = likedVideos.map((like) => like.video);

  // Send the response with the liked videos
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Liked videos fetched successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
