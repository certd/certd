var JDCloud = {
  util: require("./util"),
  // todo swaggerVar
  VERSION: "",
  fetch: require("node-fetch"),
};

module.exports = JDCloud;

require("./service");
require("./config");
require("./request");
