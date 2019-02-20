
const crypto = require('crypto');
const config = require('./config');
const path = require('path');
const fs = require('fs');
const https = require('https');
const querystring = require('querystring');


// Container for all the helpers
const helpers = {};

helpers.ensureDirectoryExistence = (filePath) => {

    let dirname = path.dirname(filePath);

    if (fs.existsSync(dirname)) {

        return true;
    }
    
    helpers.ensureDirectoryExistence(dirname);

    fs.mkdirSync(dirname);
}


// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {

    try {

        let obj = JSON.parse(str);

        return obj;

    } catch (e) {

        return {};
    }
};

helpers.hash = (str) => {

    if (typeof(str) == 'string' && str.length > 0) {

        let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');

        return hash;

    } else {
        return false;
    }

};

helpers.validateEmail = (email) => {

    let basic_email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //super basic email validation

    return basic_email_regex.test(String(email).toLowerCase());

}


// Create a string of random alpha numeric characters of a given length

helpers.createRandomString = (strLength) => {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

    let text = '';

    if (strLength) {
        allowableCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';

        for (let i = 1; i <= strLength; i++) {
            // get a random character from the allowable characters string
            text += allowableCharacters.charAt(Math.floor(Math.random() * strLength));
            // and append it to the growing text string

        }
    }

    return text;

};


// export the helpers module
module.exports = helpers;