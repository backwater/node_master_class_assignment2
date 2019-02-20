const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
const order = require('./order');
const stripe = require('./stripe');
const mailgun = require('./mailgun');

// Define all the handlers
const handlers = {};

handlers._users = {}; // containers for respective submethods
handlers._menu = {};
handlers._order = {};
handlers._stripe = {};

handlers.users = (data, callback) => {

    let acceptableMethods = ['get', 'post', 'put', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
}

handlers.menu = (data, callback) => {

    let acceptableMethods = ['get'];

    if (acceptableMethods.indexOf(data.method) > -1) {

        handlers._menu[data.method](data, callback);

    } else {

        callback(405);
    }
}

/*
  params: valid token in header
  returns : json menu string
*/

handlers._menu.get = (data, callback) => {

    if (data.headers.token && data.headers.email) {

        handlers._tokens.verifyToken(data.headers.token, data.headers.email, (tokenVerifiedStatus) => {

            if (tokenVerifiedStatus) {

                _data.read('menu', 'jimmys_pizza_menu', (err, menudata) => {

                    if (!err) {

                        callback(200, menudata);

                    } else {

                        callback(400, err);
                    }
                });

            } else {

                callback(400, { 'Error': 'User failed authentication.' });
            }
        });
    } else {

        callback(400, { 'Error': 'Missing required fields' });
    }
}


handlers.order = (data, callback) => {

    let acceptableMethods = ['post'];

    if (acceptableMethods.indexOf(data.method) > -1) {

        handlers._order[data.method](data, callback);

    } else {

        callback(405);
    }
}



/*
   params: a simple array of selected menu item numbers, put in double quotes
   returns: list of ordered items for customer to verify
*/

handlers._order.post = (data, callback) => {

    if (data.headers.token !== undefined && data.headers.email !== undefined) {

        handlers._tokens.verifyToken(data.headers.token, data.headers.email, (tokenVerifiedStatus) => {

            if (tokenVerifiedStatus) {

                _data.read('menu', 'jimmys_pizza_menu', (err, menudata) => {

                    order.confirmOrder(data.payload, menudata, (err, orderConfirmation) => {

                        if (!err) {

                            callback(200, orderConfirmation);
                        } else {
                            callback(400, { 'Order Error': err });
                        }
                    });
                });
            } else {
                callback(400, { 'Error': 'User failed authentication' });
            }
        });
    } else {

        callback(400, { 'Error': 'Missing authentication information' });

    }

}

/*
   params: a simple array of selected menu item numbers, put in double quotes
   returns: completed order acknowledgement and Stripe receipt url
*/

handlers.order_complete = async (data, callback) => {

    let acceptableMethods = ['post'];
    let orderFileCreated = false;
    let email_customer_result = false;
    let transactionResult = false;

    if (acceptableMethods.indexOf(data.method) > -1) {

        let user = await _data.getUserFromEmail(data.headers.email);

        let orderItemArray = data.payload;

        handlers._menu.get(data, async (status_code, menu) => { // note user token is verified here

            if (status_code == 200) {

                let validOrder = order.validateOrder(orderItemArray, menu);

                if (validOrder) {

                    let orderTotal = order.getItemTotal(menu, orderItemArray);

                    if (orderTotal !== undefined && !isNaN(parseFloat(orderTotal))) {

                        orderTotal = orderTotal * 100; //format into pennies for Stripe

                        let orderDescription = order.summarizeOrder(menu, orderItemArray, orderTotal / 100);

                        let orderDescriptionString = order.stringifyOrder(orderDescription);


                        try {

                              transactionResult = await stripe.purchase(orderTotal, orderDescriptionString);


                        } catch (e) {

                            console.log(e);

                            callback(400, { 'Transaction Error': e });
                        }

                        if (transactionResult && transactionResult !== undefined) {

                            // add transaction data to order email
                            orderDescriptionString += (transactionResult.outcome.seller_message !== undefined) ? '\n' + 'Payment status: ' + transactionResult.outcome.seller_message : ' please call to confirm order';
                            orderDescriptionString += (transactionResult.receipt_url !== undefined) ? '\n' + 'Receipt Url: ' + transactionResult.receipt_url : ' Unavailable. Please call to confirm order';

                            let email = {

                                "from": "Jimmy\'s Pizzeria <orders@jimmyspizzeria.mailgun.org>",
                                "to": user.email,
                                "subject": "Your Jimmy\'s Pizzeria Order",
                                "message": orderDescriptionString
                            }

                            try {

                                email_customer_result = await mailgun.send(email);

                            } catch (e) {
                                
                                //@todo - Add user message to returned json saying email failed
                                console.log(e);
                            }

                            try {

                                orderFileCreated = await order.createOrderFile(user, email);

                            } catch (e) {

                                //@todo - potentially Add user message to returned json saying problem with order file creation
                                console.log(e);
                            }

                            callback(200, { 'Order_Status': 'Completed', 'Receipt_Url': transactionResult.receipt_url });

                        } else {

                            callback(400, { 'Error': 'Transaction error' });
                        }
                    }

                } else {

                    callback(400, { 'Error': 'Invalid order' });
                }
            } else {

                callback(400, { 'Error': 'User failed authentication' });
            }

        });


    } else {

        callback(405, { 'Error': 'Method not allowed' });
    }
}



handlers.tokens = (data, callback) => {

    let acceptableMethods = ['get', 'post', 'put', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {

        handlers._tokens[data.method](data, callback);

    } else {
        callback(405);
    }
}

handlers._tokens = {};


// Tokens - post 
// Required data: email, password
// Optional Data: none

handlers._tokens.post = (data, callback) => {

    let email = typeof(data.payload.email) == 'string' && (helpers.validateEmail(data.payload.email)) ? data.payload.email.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.length > 0 ? data.payload.password.trim() : false;

    if (email && password) {

        _data.read('users', email, (err, userData) => {

            if (!err && userData) {
                // hash sent pw and compare it to the one stored in the users' data

                let hashedPassword = helpers.hash(password);

                if (hashedPassword == userData.hashedPassword) {
                    // if valid, create new token with a random name 
                    // set expiry date to one hour in future

                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() + 1000 * 60 * 60;

                    let tokenObject = {

                        'email': email,
                        'id': tokenId,
                        'expires': expires

                    };

                    _data.create('tokens', tokenId, tokenObject, (err) => {

                        if (!err) {

                            callback(200, tokenObject);

                        } else {
                            callback(500, { 'Error': 'Could not create token' });
                        }
                    });


                } else {
                    callback(400, { 'Error': 'Pw did not match users stored pw' });
                }
            } else {
                callback(400, { 'Error': 'Could not find specified user' });
            }
        });
    } else {
        callback(400, { "Error": "Missing required fields" });
    }
}



// Tokens - get
// Required data: id, email
// Optional Data: none

handlers._tokens.get = (data, callback) => {

    let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    let email = typeof(data.queryStringObject.email) == 'string' && (helpers.validateEmail(data.queryStringObject.email)) ? data.queryStringObject.email.trim() : false;
   
    if (id && email) {

        handlers._tokens.verifyToken(id, email, (tokenVerifiedStatus) => {

            if (tokenVerifiedStatus) {

                _data.read('tokens', id, (err, data) => {

                    if (!err && data) {
                        
                        callback(200, data);

                    } else {

                        callback(404);
                    }
                });
            } else {

                callback(400, { 'Error': 'User failed authentication' });
            }
        });

    } else {

        callback(400, { 'Error': 'Token not found' })
    }
}


// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {

    let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    let extend = typeof(data.payload.extend) == 'boolean' ? data.payload.extend : false;

    if (id && extend) {

        _data.read('tokens', id, (err, data) => {

            if (!err) {

                data.expires = Date.now() + 1000 * 60 * 60;

                _data.update('tokens', id, data, (err) => {

                    if (!err) {

                        callback(200, {});

                    } else {

                        callback(400, { 'Error': 'Could not update token' });
                    }

                });
            } else {
                callback(400, { 'Error': 'Could not retrieve token to update' });
            }
        });
    } else

    {
        callback(400, { 'Error': 'Token not found or extended.' });
    }
}


// Tokens - delete
// Required data: id
// Optional data: none

handlers._tokens.delete = (data, callback) => {

    let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (id) {

        _data.read('tokens', id, (err, data) => {

            if (!err) {

                _data.delete('tokens', id, (err) => {

                    if (!err) {
                        callback(200, {});
                    } else {
                        callback(400, { 'Error': 'Could not delete token' });
                    }
                });

            } else {
                callback(400, { 'Error': 'Could not retrieve token to delete' });
            }
        });
    } else

    {
        callback(400, { 'Error': 'Missing required fields' });
    }
}


// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, email, callback) => {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            // Check that the token is for the given user and has not expired
            if (tokenData.email == email && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};


handlers._users.post = (data, callback) => {

    let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.length > 0 ? data.payload.lastName.trim() : false;
    let email = typeof(data.payload.email) == 'string' && (helpers.validateEmail(data.payload.email)) ? data.payload.email.trim() : false;
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let address = typeof(data.payload.address) == 'string' ? data.payload.address.trim() : false;
    let city = typeof(data.payload.city) == 'string' ? data.payload.city.trim() : false;
    let state = typeof(data.payload.state) == 'string' ? data.payload.state.trim() : false;
    let zip = typeof(data.payload.zip) == 'string' && data.payload.zip.length == 5 ? data.payload.zip.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' ? data.payload.tosAgreement : false; // more economical version than tutorial, I think //dwc

    if (firstName &&
        lastName &&
        email &&
        // phone && // we can let phone be optional, ( but recommeded  ! ) 
        address &&
        city &&
        state && zip &&
        password &&
        tosAgreement) {

        _data.read('users', email, (err, data) => {

            if (err) {
                // if this user file doesn't exist 
                //( and it's not supposed to with this method) 
                // create it

                // Hash the password
                let hashedPassword = helpers.hash(password);

                // Create the user object
                if (hashedPassword) {

                    let userObject = {

                        'firstName': firstName,
                        'lastName': lastName,
                        'email': email,
                        'phone': phone,
                        'address': address,
                        'city': city,
                        'state': state,
                        'zip': zip,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    };


                    _data.create('users', email, userObject, (err) => {

                        if (!err) {

                            callback(200, { 'Congratulations!': 'You have successfully registered as an online customer of Jimmy\'s Pizzeria!' });
                        
                        } else {

                            console.log(err);
                            callback(500, { 'Error': 'Could not create the new user' });
                        }
                    });
                } else {

                    callback(500, { 'Error': 'Could not hash the user\'s password.' });
                }

            } else {
                // User already exists
                callback(400, { 'Error': 'A user with that email already exists' });
            }
        });

    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }

};


// Required data: email
// Optional data: none

handlers._users.get = (data, callback) => {
    // Check that email is valid 

    let email = typeof(data.queryStringObject.email) == 'string' && (helpers.validateEmail(data.queryStringObject.email)) ? data.queryStringObject.email.trim() : false;

    if (email) {

        // Get token from headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, email, (tokenIsValid) => {

            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', email, (err, data) => {

                    if (!err && data) {
                        // Remove the hashed password from the user user object before returning it to the requester
                        delete data.hashedPassword;

                        callback(200, data);

                    } else {

                        callback(404);
                    }
                });

            } else {

                callback(403, { "Error": "Token or user email is invalid." })
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
};

// Required data: email
// Optional data: firstName, lastName, address, city, state, zip, password (at least one must be specified)

handlers._users.put = (data, callback) => {
    // Check for required field

    let email = typeof(data.payload.email) == 'string' && (helpers.validateEmail(data.payload.email)) ? data.payload.email.trim() : false;

    // Check for optional fields
    let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    let address = typeof(data.payload.address) == 'string' ? data.payload.address.trim() : false;
    let city = typeof(data.payload.city) == 'string' ? data.payload.city.trim() : false;
    let state = typeof(data.payload.state) == 'string' ? data.payload.state.trim() : false;
    let zip = typeof(data.payload.zip) == 'string' && data.payload.zip.length == 5 ? data.payload.zip.trim() : false;

    // Error if email is invalid
    if (email) {

        // Error if nothing is sent to update
        if (firstName || lastName || password ||
            phone || address || city || state || zip) {

            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, email, (tokenIsValid) => {

                if (tokenIsValid) {

                    // Lookup the user
                    _data.read('users', email, (err, userData) => {

                        if (!err && userData) {

                            // Update the fields if necessary
                            if (firstName) {
                                userData.firstName = firstName;
                            }

                            if (lastName) {
                                userData.lastName = lastName;
                            }

                            if (phone) {
                                userData.phone = phone;
                            }

                            if (city) {
                                userData.city = city;
                            }

                            if (state) {
                                userData.state = state;
                            }

                            if (zip) {
                                userData.zip = zip;
                            }

                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }
                            // Store the new updates
                            _data.update('users', email, userData, (err) => {

                                if (!err) {
                                    callback(200);

                                } else {

                                    console.log(err);
                                    callback(500, { 'Error': 'Could not update the user.' });
                                }
                            });

                        } else {

                            callback(400, { 'Error': 'Specified user does not exist.' });
                        }

                    }); //end data read 

                } // if end token is valid
                else {

                    callback(403, { "Error": "Missing required token in header, or token is invalid." });
                }

            }); // end verify token

        } else {
            callback(400, { 'Error': 'Missing required field.' });
        }
    } else {
        callback(400, { 'Error': 'Valid email is required.' });
    }

};

// Required data: email

handlers._users.delete = (data, callback) => {

    // Check that email is valid   
    let email = typeof(data.queryStringObject.email) == 'string' && (helpers.validateEmail(data.queryStringObject.email)) ? data.queryStringObject.email.trim() : false;

    if (email) {

        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the email
        handlers._tokens.verifyToken(token, email, (tokenIsValid) => {

            // Lookup the user if token check passes

            if (tokenIsValid) {

                _data.read('users', email, (err, data) => {

                    if (!err && data) {

                        _data.delete('users', email, (err) => {

                            if (!err) {

                               //@todo - also could clean up order files from deleted user/customers here

                                callback(200);

                            } else {
                                callback(500, { 'Error': 'Could not delete the specified user' });
                            }
                        });

                    } else {
                        callback(400, { 'Error': 'Could not find the specified user.' });
                    }
                });

            } else {

                callback(400, { 'Error': 'User not authorized to delete.' });
            }

        });

    } else {

        callback(400, { 'Error': 'Missing required field' })
    }
};


handlers.not_found = () => {

    callback(404, { 'Error': 'Url not found' });
}


module.exports = handlers;