const https = require('https');
const config = require('./config');
const querystring = require('querystring');
const helpers = require('./helpers');

// use  querystring stringify and *not* JSON.stringify for posting to stripe, as it takes application/x-www-form-urlencoded content type


/* 
  Talk to Stripe API
*/


const stripe = {

                options: {
                    protocol: 'https:',
                    host: 'api.stripe.com',
                    port: 443,
                    path: '/v1/charges',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        "Authorization": config.stripeKey
                    }
                },

                   /*
                      Sends payment data to Stripe API for purchasing )
                      params: total amount, purchase description object
                      returns: resolved or rejected promise that wraps API call
                   */

                purchase: (total, purchase_description) => {

                    return new Promise((resolve, reject) => {

                        let stripe_request_body = querystring.stringify({

                            amount: total,
                            currency: 'usd',
                            description: purchase_description,
                            source: 'tok_visa'

                        });

                        let stripe_req = https.request(stripe.options, (res) => {

                            res.setEncoding('utf8');

                            res.on('data', (chunk) => {

                                let response = helpers.parseJsonToObject(chunk);

                                if (response.error === undefined) {

                                    resolve(response);

                                } else {

                                    reject(response);
                                }

                            });
                        });

                        stripe_req.on('error', (e) => {

                            reject(e.message);

                        });

                        stripe_req.write(stripe_request_body);

                        stripe_req.end();

                    });
                }
}

module.exports = stripe;