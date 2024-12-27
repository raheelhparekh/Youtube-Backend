import mongoose from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid format video ID");
  }

  const getComment = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
  ]);
});

const addComment = asyncHandler(async (req, res) => {
  //  add a comment to a video
  const { content } = req.body;
  const videoId = req.params;
  const user = req.user?._id;

  console.log(videoId);
  console.log(content);
  console.log(user);

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid format video ID");
  }

  if (!content) {
    throw new ApiError(400, "Comment content is required");
  }

  if (!user) {
    throw new ApiError(401, "You need to be logged in to comment");
  }

  const comment = await Comment.create({
    owner: user,
    content,
    video: videoId,
  });

  console.log(comment);

  if (!comment) {
    throw new ApiError(500, "Error adding comment");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  //  update a comment

  const { videoId, commentId } = req.params;
  const { content } = req.body;
  const user = req.user?._id;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  if (!commentId) {
    throw new ApiError(400, "Comment ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid format comment ID");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid format video ID");
  }
  if (!content) {
    throw new ApiError(400, "Comment content is required");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== user.toString()) {
    throw new ApiError(403, "You are not allowed to update this comment");
  }

  comment.content = content;
  const updatedComment = await comment.save();
  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  //  delete a comment
  const { videoId,commentId } = req.params;
  const user = req.user?._id;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }
  if (!commentId) {
    throw new ApiError(400, "Comment ID is required");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid format video ID");
  }
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid format comment ID");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment.owner.toString() !== user.toString()) {
    throw new ApiError(403, "You are not allowed to delete this comment");
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
