const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

const app = require("./src/app");
const config = require("./src/config");
const logger = require("./src/utils/logger");

const PORT = config.port || 5004;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.env} mode`);
});
