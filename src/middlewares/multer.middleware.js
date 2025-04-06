import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // jis bhi name se user ne upload kiya, ussi name se hum store kr lenge - although not good practice because if multiple files with same name come, they migh get overwritten but okay because they will stay on the server for a very tiny amt of time.
    // yaha se we will also get that localFilePath that we needed
  },
});

export const upload = multer({ storage });
