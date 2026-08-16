import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import upload from "./config/multer.js";
import cloudinary from "./config/cloudinary.js";
import env from "dotenv";

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;

env.config();

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

// PostgreSQL
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

await db.connect();

// ================= HOME =================

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// ================= DASHBOARD =================

app.get("/dashboard", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("dashboard.ejs");
  } else {
    res.redirect("/login");
  }
});

// ================= LOGOUT =================

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }

    res.redirect("/");
  });
});

app.get("/files/:type", async (req, res) => {

  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const type = req.params.type;

  try {

    const result = await db.query(
      `
      SELECT *
      FROM media
      WHERE user_id = $1
      AND file_type = $2
      ORDER BY uploaded_at DESC
      `,
      [req.user.id, type]
    );

    res.render("files.ejs", {
      type,
      files: result.rows
    });

  } catch (err) {

    console.log(err);

    res.send("Database Error");

  }

});

// ================= GOOGLE LOGIN =================

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  })
);

// ================= LOCAL LOGIN =================

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  })
);


// ================= DOWNLOAD FILE =================

app.get("/download/:id", async (req, res) => {

  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  try {

    // Get file only from logged-in user's account
    const result = await db.query(
      `
      SELECT *
      FROM media
      WHERE id = $1
      AND user_id = $2
      `,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("File not found.");
    }

    const file = result.rows[0];

    // Fetch file from Cloudinary
    const response = await fetch(file.file_url);

    if (!response.ok) {
      return res.status(500).send("Unable to download file.");
    }

    // File type
    const contentType =
      response.headers.get("content-type") ||
      "application/octet-stream";

    // Download with original filename
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.file_name}"`
    );

    res.setHeader("Content-Type", contentType);

    // Send file
    const buffer = await response.arrayBuffer();

    res.send(Buffer.from(buffer));

  } catch (err) {

    console.log(err);

    res.status(500).send("Download failed.");

  }

});


// ================= REGISTER =================

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (checkResult.rows.length > 0) {
      return res.redirect("/login");
    }

    bcrypt.hash(password, saltRounds, async (err, hash) => {
      if (err) {
        console.log(err);
        return;
      }

      const result = await db.query(
        "INSERT INTO users(email,password) VALUES($1,$2) RETURNING *",
        [email, hash]
      );

      const user = result.rows[0];

      req.login(user, (err) => {
        if (err) {
          console.log(err);
          return;
        }

        console.log("Registration Success");
        res.redirect("/dashboard");
      });
    });
  } catch (err) {
    console.log(err);
  }
});

app.post("/upload", upload.single("file"), async (req, res) => {

  try {

    if (!req.file) {
      return res.send("No file selected.");
    }

    const type = req.body.type;
    const mime = req.file.mimetype;
    const fileSize = req.file.size;

    const MB = 1024 * 1024;

    // ================= FILE SIZE VALIDATION =================

    if (type === "image" && fileSize > 10 * MB) {

      return res.send("Image size must be below 10 MB.");

    }

    if (type === "video" && fileSize > 100 * MB) {

      return res.send("Video size must be below 100 MB.");

    }

    if (type === "document" && fileSize > 10 * MB) {

      return res.send("Document size must be below 10 MB.");

    }

    if (type === "text" && fileSize > 10 * MB) {

      return res.send("Text size must be below 10 MB.");

    }

    // ================= FILE VALIDATION =================

    if (type === "image" && !mime.startsWith("image/")) {

      return res.send("Only Image files are allowed.");

    }

    if (type === "video" && !mime.startsWith("video/")) {

      return res.send("Only Video files are allowed.");

    }

    if (type === "document") {

      const allowedDocs = [

        "application/pdf",

        "application/msword",

        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        "application/vnd.ms-powerpoint",

        "application/vnd.openxmlformats-officedocument.presentationml.presentation",

        "application/vnd.ms-excel",

        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

      ];

      if (!allowedDocs.includes(mime)) {

        return res.send("Only Document files are allowed.");

      }

    }

    if (type === "text") {

      const allowedText = [

        "text/plain",

        "application/json",

        "text/csv",

        "application/xml",

        "text/xml"

      ];

      if (!allowedText.includes(mime)) {

        return res.send("Only Text files are allowed.");

      }

    }

    if (!req.file) {
      return res.send("No file selected.");
    }

    let resourceType = "auto";

    if (type === "video") {
      resourceType = "video";
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "secure-vault",
      resource_type: resourceType
    });

    // Save in PostgreSQL
    await db.query(
      `
      INSERT INTO media
      (
        user_id,
        file_name,
        file_type,
        file_url,
        public_id,
        file_size
      )
      VALUES($1,$2,$3,$4,$5,$6)
      `,

      [
        req.user.id,
        req.file.originalname,
        type,
        result.secure_url,
        result.public_id,
        result.bytes
      ]

    );

    console.log("Saved Successfully");
    console.log(result);

    res.redirect("/files/" + req.body.type);

  } catch (err) {
    console.log(err);
    res.send(err.message);
  }

});

app.post("/delete/:id", async (req, res) => {
  try {

    const id = req.params.id;

    // Get file details
    const result = await db.query(
      "SELECT * FROM media WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.send("File not found");
    }

    const file = result.rows[0];

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(file.public_id);

    // Delete from PostgreSQL
    await db.query(
      "DELETE FROM media WHERE id = $1",
      [id]
    );

    // Redirect to same page
    res.redirect("/files/" + file.file_type);

  } catch (err) {
    console.log(err);
    res.send("Delete Failed");
  }
});

// ================= PASSPORT LOCAL =================

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query(
        "SELECT * FROM users WHERE email=$1",
        [username]
      );

      if (result.rows.length === 0) {
        return cb(null, false);
      }

      const user = result.rows[0];

      bcrypt.compare(password, user.password, (err, valid) => {
        if (err) {
          return cb(err);
        }

        if (valid) {
          return cb(null, user);
        } else {
          return cb(null, false);
        }
      });
    } catch (err) {
      return cb(err);
    }
  })
);

// ================= PASSPORT GOOGLE =================

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },

    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE email=$1",
          [profile.email]
        );

        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users(email,password) VALUES($1,$2) RETURNING *",
            [profile.email, "google"]
          );

          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

// ================= PASSPORT SESSION =================

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

// ================= SERVER =================

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});