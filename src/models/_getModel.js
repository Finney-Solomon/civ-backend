const mongoose = require("mongoose");

module.exports = function getModel(name, schema, collection) {
  return mongoose.models[name] || mongoose.model(name, schema, collection);
};
