const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();
const apiUrl = process.env.REACT_APP_ENV === 'production'
? process.env.REACT_APP_LIVE_API
: process.env.REACT_APP_LOCAL_API;

// Enable CORS for React to make requests
app.use(cors());

// Configure multer to save files in 'public/uploads/' folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/"); // File will be saved here
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Create a unique filename
  },
});

const upload = multer({ storage: storage });

// POST route to handle the file upload
app.post("/upload", upload.single("thumbnailUrl"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  // Get the file URL path
  const imageUrl = `/uploads/${req.file.filename}`; // Image path relative to public directory

  res.status(200).json({ imageUrl }); // Send the image URL as response
});

// Start server on port 5000 (or another port you prefer)
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
