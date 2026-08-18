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
import { Readable } from "stream";


// ================= ENV =================

env.config();


// ================= APP =================

const app = express();

const port = process.env.PORT || 3000;

const saltRounds = 10;


// ================= SESSION =================

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true
    })
);


// ================= MIDDLEWARE =================

app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

app.use(express.json());

app.use(express.static("public"));


// ================= PASSPORT =================

app.use(passport.initialize());

app.use(passport.session());


// ================= POSTGRESQL =================

const db = new pg.Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }
});


// ================= DATABASE TEST =================

db.connect()
    .then(client => {

        console.log("PostgreSQL connected successfully");

        client.release();

    })
    .catch(err => {

        console.log("PostgreSQL connection error:");

        console.log(err);

    });


// ======================================================
// CLOUDINARY MEMORY UPLOAD FUNCTION
// ======================================================

function uploadToCloudinary(buffer, resourceType = "auto") {

    return new Promise((resolve, reject) => {

        const uploadStream =
            cloudinary.uploader.upload_stream(

                {
                    folder: "secure-vault",

                    resource_type: resourceType
                },

                (error, result) => {

                    if (error) {

                        reject(error);

                    } else {

                        resolve(result);

                    }

                }

            );


        Readable
            .from(buffer)
            .pipe(uploadStream);

    });

}


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

    res.render("home.ejs");

});


// ======================================================
// LOGIN PAGE
// ======================================================

app.get("/login", (req, res) => {

    res.render("login.ejs");

});


// ======================================================
// REGISTER PAGE
// ======================================================

app.get("/register", (req, res) => {

    res.render("register.ejs");

});


// ======================================================
// DASHBOARD
// ======================================================

app.get("/dashboard", (req, res) => {

    if (!req.isAuthenticated()) {

        return res.redirect("/login");

    }

    res.render("dashboard.ejs");

});


// ======================================================
// LOGOUT
// ======================================================

app.get("/logout", (req, res, next) => {

    req.logout((err) => {

        if (err) {

            return next(err);

        }

        res.redirect("/");

    });

});


// ======================================================
// FILES PAGE
// ======================================================

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

            [
                req.user.id,
                type
            ]

        );


        res.render("files.ejs", {

            type: type,

            files: result.rows

        });


    } catch (err) {

        console.log(err);

        res
            .status(500)
            .send("Database Error");

    }

});


// ======================================================
// GOOGLE LOGIN
// ======================================================

app.get(
    "/auth/google",

    passport.authenticate(
        "google",
        {
            scope: [
                "profile",
                "email"
            ]
        }
    )

);


// ======================================================
// GOOGLE CALLBACK
// ======================================================

app.get(

    "/auth/google/secrets",

    passport.authenticate(
        "google",
        {
            successRedirect: "/dashboard",
            failureRedirect: "/login"
        }
    )

);


// ======================================================
// LOCAL LOGIN
// ======================================================

app.post(

    "/login",

    passport.authenticate(
        "local",
        {
            successRedirect: "/dashboard",
            failureRedirect: "/login"
        }
    )

);


// ======================================================
// REGISTER
// ======================================================

app.post("/register", async (req, res) => {

    const email = req.body.username;

    const password = req.body.password;


    try {

        const checkResult = await db.query(

            `
            SELECT *
            FROM users
            WHERE email = $1
            `,

            [email]

        );


        if (checkResult.rows.length > 0) {

            return res.redirect("/login");

        }


        const hash =
            await bcrypt.hash(
                password,
                saltRounds
            );


        const result = await db.query(

            `
            INSERT INTO users
            (
                email,
                password
            )
            VALUES
            (
                $1,
                $2
            )
            RETURNING *
            `,

            [
                email,
                hash
            ]

        );


        const user = result.rows[0];


        req.login(user, (err) => {

            if (err) {

                console.log(err);

                return res
                    .status(500)
                    .send("Login error");

            }


            res.redirect("/dashboard");

        });


    } catch (err) {

        console.log(err);

        res
            .status(500)
            .send("Registration failed");

    }

});


// ======================================================
// UPLOAD FILE
// ======================================================

app.post(

    "/upload",

    upload.single("file"),

    async (req, res) => {

        try {

            // ===============================
            // LOGIN CHECK
            // ===============================

            if (!req.isAuthenticated()) {

                return res.redirect("/login");

            }


            // ===============================
            // FILE CHECK
            // ===============================

            if (!req.file) {

                return res
                    .status(400)
                    .send("No file selected.");

            }


            const type = req.body.type;

            const mime = req.file.mimetype;

            const fileSize = req.file.size;

            const MB = 1024 * 1024;


            // ===============================
            // FILE TYPE VALIDATION
            // ===============================

            if (
                type === "image" &&
                !mime.startsWith("image/")
            ) {

                return res.send(
                    "Only Image files are allowed."
                );

            }


            if (
                type === "video" &&
                !mime.startsWith("video/")
            ) {

                return res.send(
                    "Only Video files are allowed."
                );

            }


            // ===============================
            // DOCUMENT VALIDATION
            // ===============================

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

                    return res.send(
                        "Only Document files are allowed."
                    );

                }

            }


            // ===============================
            // TEXT VALIDATION
            // ===============================

            if (type === "text") {

                const allowedText = [

                    "text/plain",

                    "application/json",

                    "text/csv",

                    "application/xml",

                    "text/xml"

                ];


                if (!allowedText.includes(mime)) {

                    return res.send(
                        "Only Text files are allowed."
                    );

                }

            }


            // ===============================
            // SIZE VALIDATION
            // ===============================

            if (
                type === "video" &&
                fileSize > 100 * MB
            ) {

                return res.send(
                    "Video size must be below 100 MB."
                );

            }


            if (
                type !== "video" &&
                fileSize > 10 * MB
            ) {

                return res.send(
                    "File size must be below 10 MB."
                );

            }


            // ===============================
            // CLOUDINARY RESOURCE TYPE
            // ===============================

            let resourceType = "auto";


            if (type === "video") {

                resourceType = "video";

            }


            // ===============================
            // UPLOAD TO CLOUDINARY
            // ===============================

            console.log(
                "Uploading to Cloudinary..."
            );


            const result =
                await uploadToCloudinary(

                    req.file.buffer,

                    resourceType

                );


            console.log(
                "Cloudinary upload successful"
            );


            console.log(
                result.secure_url
            );


            // ===============================
            // SAVE TO POSTGRESQL
            // ===============================

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
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )
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


            console.log(
                "Saved successfully in PostgreSQL"
            );


            // ===============================
            // REDIRECT
            // ===============================

            res.redirect(
                "/files/" + type
            );


        } catch (err) {

            console.log(
                "UPLOAD ERROR:"
            );

            console.log(err);


            res
                .status(500)
                .send(
                    "Upload failed: " +
                    err.message
                );

        }

    }

);


// ======================================================
// DOWNLOAD FILE
// ======================================================

app.get("/download/:id", async (req, res) => {

    if (!req.isAuthenticated()) {

        return res.redirect("/login");

    }


    try {

        const result = await db.query(

            `
            SELECT *
            FROM media
            WHERE id = $1
            AND user_id = $2
            `,

            [
                req.params.id,
                req.user.id
            ]

        );


        if (result.rows.length === 0) {

            return res
                .status(404)
                .send("File not found.");

        }


        const file = result.rows[0];


        const response =
            await fetch(file.file_url);


        if (!response.ok) {

            return res
                .status(500)
                .send("Unable to download file.");

        }


        const buffer =
            await response.arrayBuffer();


        res.setHeader(

            "Content-Disposition",

            `attachment; filename="${file.file_name}"`

        );


        res.setHeader(

            "Content-Type",

            response.headers.get(
                "content-type"
            ) || "application/octet-stream"

        );


        res.send(
            Buffer.from(buffer)
        );


    } catch (err) {

        console.log(err);

        res
            .status(500)
            .send("Download failed.");

    }

});


// ======================================================
// DELETE FILE
// ======================================================

app.post("/delete/:id", async (req, res) => {

    if (!req.isAuthenticated()) {

        return res.redirect("/login");

    }


    try {

        const result = await db.query(

            `
            SELECT *
            FROM media
            WHERE id = $1
            AND user_id = $2
            `,

            [
                req.params.id,
                req.user.id
            ]

        );


        if (result.rows.length === 0) {

            return res
                .status(404)
                .send("File not found.");

        }


        const file = result.rows[0];


        // ===============================
        // CLOUDINARY RESOURCE TYPE
        // ===============================

        let resourceType = "image";


        if (file.file_type === "video") {

            resourceType = "video";

        }


        // ===============================
        // DELETE CLOUDINARY
        // ===============================

        await cloudinary.uploader.destroy(

            file.public_id,

            {
                resource_type: resourceType
            }

        );


        // ===============================
        // DELETE DATABASE
        // ===============================

        await db.query(

            `
            DELETE FROM media
            WHERE id = $1
            AND user_id = $2
            `,

            [
                req.params.id,
                req.user.id
            ]

        );


        res.redirect(
            "/files/" + file.file_type
        );


    } catch (err) {

        console.log(err);

        res
            .status(500)
            .send("Delete failed.");

    }

});


// ======================================================
// PASSPORT LOCAL STRATEGY
// ======================================================

passport.use(

    "local",

    new Strategy(

        async function verify(
            username,
            password,
            cb
        ) {

            try {

                const result = await db.query(

                    `
                    SELECT *
                    FROM users
                    WHERE email = $1
                    `,

                    [username]

                );


                if (result.rows.length === 0) {

                    return cb(
                        null,
                        false
                    );

                }


                const user =
                    result.rows[0];


                const valid =
                    await bcrypt.compare(
                        password,
                        user.password
                    );


                if (!valid) {

                    return cb(
                        null,
                        false
                    );

                }


                return cb(
                    null,
                    user
                );


            } catch (err) {

                return cb(err);

            }

        }

    )

);


// ======================================================
// PASSPORT GOOGLE STRATEGY
// ======================================================

passport.use(

    "google",

    new GoogleStrategy(

        {

            clientID:
                process.env.GOOGLE_CLIENT_ID,

            clientSecret:
                process.env.GOOGLE_CLIENT_SECRET,

            callbackURL:
                process.env.GOOGLE_CALLBACK_URL ||
                "http://localhost:3000/auth/google/secrets",

            userProfileURL:
                "https://www.googleapis.com/oauth2/v3/userinfo"

        },


        async (
            accessToken,
            refreshToken,
            profile,
            cb
        ) => {

            try {

                const result =
                    await db.query(

                        `
                        SELECT *
                        FROM users
                        WHERE email = $1
                        `,

                        [profile.email]

                    );


                // ===============================
                // NEW GOOGLE USER
                // ===============================

                if (result.rows.length === 0) {

                    const newUser =
                        await db.query(

                            `
                            INSERT INTO users
                            (
                                email,
                                password
                            )
                            VALUES
                            (
                                $1,
                                $2
                            )
                            RETURNING *
                            `,

                            [
                                profile.email,
                                "google"
                            ]

                        );


                    return cb(
                        null,
                        newUser.rows[0]
                    );

                }


                // ===============================
                // EXISTING USER
                // ===============================

                return cb(
                    null,
                    result.rows[0]
                );


            } catch (err) {

                return cb(err);

            }

        }

    )

);


// ======================================================
// SERIALIZE USER
// ======================================================

passport.serializeUser(
    (user, cb) => {

        cb(
            null,
            user.id
        );

    }
);


// ======================================================
// DESERIALIZE USER
// ======================================================

passport.deserializeUser(
    async (id, cb) => {

        try {

            const result = await db.query(

                `
                SELECT *
                FROM users
                WHERE id = $1
                `,

                [id]

            );


            if (result.rows.length === 0) {

                return cb(
                    null,
                    false
                );

            }


            cb(
                null,
                result.rows[0]
            );


        } catch (err) {

            cb(err);

        }

    }
);


// ======================================================
// SERVER
// ======================================================

app.listen(

    port,

    () => {

        console.log(
            `Server running on port ${port}`
        );

    }

);