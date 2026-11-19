import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
}).single("logo");

export const readLogoUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(400).send({ message: "File must be under 2 MB." });
    }

    if (err) {
      return res.status(400).send({ message: "Unsupported file type." });
    }

    return next();
  });
};
