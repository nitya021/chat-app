import express from "express";
import multer from "multer";
import path from "path";

const router = express.Router();

// Storage settings
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/");
  },
  filename: (_req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

// POST /upload
router.post(
  "/",
  upload.single("profilePic"),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded" });
    }

    res.json({
      imageUrl: `/uploads/${req.file.filename}`,
    });
  }
);

export default router;