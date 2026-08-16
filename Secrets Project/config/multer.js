import multer from "multer";
import path from "path";

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        cb(
            null,
            uniqueName + path.extname(file.originalname)
        );

    }

});


const fileFilter = (req, file, cb) => {

    const allowedTypes = [

        // Images
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",

        // Videos
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska",

        // Documents
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        // Text
        "text/plain"

    ];


    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(new Error("Unsupported File Type"), false);

    }

};


const upload = multer({

    storage,

    fileFilter,

    limits: {

        // Maximum allowed by our upload flow
        // Video → 100 MB
        fileSize: 100 * 1024 * 1024

    }

});


export default upload;