const functions = require("./index");
Object.assign(functions, require("./statistics"));
const clientVerification = require("./client-verification");
functions.requestClientVerification = clientVerification.requestClientVerification;
functions.verifyClientVerification = clientVerification.verifyClientVerification;
module.exports = functions;
