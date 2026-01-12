// Local server runner (NOT used by Vercel serverless)
if (process.env.NODE_ENV !== "production") {
  // optional for local usage only
  require("dotenv").config();
}

const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");

const PORT = config.port || 5004;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.env} mode`);
});
