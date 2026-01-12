const path = require("path");

// load .env only for local dev (Vercel uses Environment Variables)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: path.join(process.cwd(), ".env") });
}

const app = require("../src/app"); // change path if your app.js is in root
module.exports = app;
