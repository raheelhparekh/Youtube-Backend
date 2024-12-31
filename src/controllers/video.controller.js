import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

// ALGORITHM TO PUBLISH A VIDEO
// STEP 1 : get title + description from req.body or form data
// STEP 2 : check both title & description required as set required in database
// STEP 3: Upload video & thumbnail first on Local machine
// STEP 4: Check both thumbnail & video is required
// STEP 5: Upload video & thumbnail to cloudinary
// STEP 6 : Check both have been uploaded succesfully, else throw a error
// STEP 7 : Create Video Data and add to database
// STEP 8 : Return response if video has been published successfully
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // get video, upload to cloudinary, create video
  if (!(title && description)) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoLocalPath = req.files?.video[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video and thumbnail are required");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Error while uploading video files on cloudinary");
  }
  if (!thumbnail) {
    throw new ApiError(
      400,
      "Error while uploading thumbnail files on cloudinary"
    );
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    owner: req.user?._id,
  });

  const videoUploaded = await Video.findById(video?._id);

  if (!videoUploaded) {
    throw new ApiError(500, "Something went wrong while publishing video");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(200, videoUploaded, "Video has been succesfully uploaded")
    );
});

// ALGORITHM TO GET VIDEO BY ID
// STEP 1 : get videoId from req.params
// STEP 2 : check videoId is required
// STEP 3 : find video by videoId
// STEP 4 : check if video exists with that videoId
// STEP 5 : return response with video details
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video Id required to fetch details");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError("Video Id cannot be found");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video details fetched succesfully"));
});

// ALGORITHM TO UPDATE VIDEO
// STEP 1 : get videoId from req.params
// STEP 2 : check videoId is required
// STEP 3 : find video by videoId
// STEP 4 : check if video exists with that videoId
// STEP 5 : create empty updatedVideo object
// STEP 6 : check if title is present in req.body, then add it to updatedVideo object
// STEP 7 : check if description is present in req.body, then add it to updatedVideo object
// STEP 8 : check if videoFile is present in req.file, then upload it to cloudinary and add it to updatedVideo object
// STEP 9 : check if thumbnail is present in req.file, then upload it to cloudinary and add it to updatedVideo object
// STEP 10 : update video with updatedVideo object
// STEP 11 : return response with video updated successfully
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //update video details like title, description, thumbnail
  if (!videoId) {
    throw new ApiError(401, "Unable to find video id to update");
  }

  const videoFind = await Video.findById(videoId);
  if (!videoFind) {
    throw new ApiError(404, "Video not found to update");
  }

  const { title, description } = req.body;
  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  const updatedVideo = {};

  if (title) {
    updatedVideo.title = title;
  }
  if (description) {
    updatedVideo.description = description;
  }

  if (videoFileLocalPath) {
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    if (!videoFile) {
      throw new ApiError(400, "Error uploading video file to cloudinary");
    }
    updatedVideo.videoFile = videoFile.url;
  }

  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
      throw new ApiError(400, "Error uploading thumbnail file to cloudinary");
    }
    updatedVideo.thumbnail = thumbnail.url;
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updatedVideo
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated succesfully"));
});

// ALGORITHM TO DELETE VIDEO
// STEP 1 : get videoId from req.params
// STEP 2 : check videoId is required
// STEP 3 : find video by videoId
// STEP 4 : check if video exists with that videoId
// STEP 5 : extract public id of video file and thumbnail using extractPublicId function
// STEP 6 : delete video file and thumbnail from cloudinary using deleteFromCloudinary function using public id
// STEP 7 : delete video from database using findByIdAndDelete
// STEP 8 : return response with video deleted successfully
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // delete video

  if (!videoId) {
    throw new ApiError(400, "Video cannot be found which needs to be deleted");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found to be deleted");
  }

  const videoPublicId = extractPublicId(video.videoFile);
  if (videoPublicId) {
    await deleteFromCloudinary(videoPublicId);
  } else {
    throw new ApiError(
      404,
      "Video public ID not found to be deleted. cloudinary  error"
    );
  }

  const thumbnailPublicId = extractPublicId(thumbnail.thumbnail);
  if (thumbnailPublicId) {
    await deleteFromCloudinary(thumbnailPublicId);
  } else {
    throw new ApiError(
      404,
      "Thumbnail public ID not found to be deleted. cloudinary  error"
    );
  }

  await Video.findByIdAndDelete(videoId);

  return res
    .status(201)
    .json(new ApiResponse(201, null, "Video deleted successfully"));
});

// ALGORITHM TO TOGGLE PUBLISH STATUS
// STEP 1 : get videoId from req.params
// STEP 2 : check videoId is required
// STEP 3 : find video by videoId
// STEP 4 : check if video exists with that videoId
// STEP 5 : toggle isPublished status of video
// STEP 6 : save video with updated isPublished status
// STEP 7 : return response with video status updated
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video id cannot be found");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(401, "Video id not found");
  }

  video.isPublished = !video.isPublished;

  await video.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        video,
        `Video status is ${video.isPublished ? "published" : "unpublished"} succesfully`
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
