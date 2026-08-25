const functions = require("./index");
Object.assign(functions, require("./statistics"));
Object.assign(functions, require("./client-schema-migration"));
const clientVerification = require("./client-verification");
functions.requestClientVerification = clientVerification.requestClientVerification;
functions.verifyClientVerification = clientVerification.verifyClientVerification;
functions.cleanupClientVerifications = clientVerification.cleanupClientVerifications;
module.exports = functions;
