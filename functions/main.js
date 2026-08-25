const functions = require("./index");
Object.assign(functions, require("./statistics"));
Object.assign(functions, require("./client-verification"));
module.exports = functions;
