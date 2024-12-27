import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";

const router = Router();


router.route("/get-video-comments/:videoId").get(verifyJWT, getVideoComments);
router.route("/:videoId/:commentId").post(verifyJWT, addComment);
router.route("/:videoId/:commentId").patch(verifyJWT, updateComment);
router.route("/:videoId/:commentId").delete(verifyJWT,deleteComment);

export default router;
