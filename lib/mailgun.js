
const https = require('https');
const config = require('./config');
const querystring = require('querystring');
const helpers = require('./helpers');

const userpw = 'api' + ':' + config.mailGunKey;
const encoded_key = Buffer.from(userpw).toString('base64');


/*
   Talks to Mailgun API
*/

const mailgun = {

                 options : {
                            protocol: 'https:',
                            host: 'api.mailgun.net',
                            port: 443,
                            path: '/v3/'+ config.mailGunSandboxDomain +'/messages',
                            method: 'POST',
                            headers: {
                                        'Content-Type': 'application/x-www-form-urlencoded',
                                        'Authorization': 'Basic ' + encoded_key
                                      }          
                            },

                   /*
                      Sends email via Mailgun API  ( assuming email is on approved email list in Mailgun account )
                      params: email object
                      returns: resolved or rejected promise that wraps API call
                   */

                   send:( emailObj ) => {

                      return new Promise( ( resolve, reject ) => {
                     
                        let mailgun_request_body = querystring.stringify({
                           
                            'from':emailObj.from,
                            'to':emailObj.to, 
                            'subject':emailObj.subject, 
                            'text':emailObj.message
                        
                         });

                        let mailgun_req = https.request(mailgun.options, (res) => {

                            res.setEncoding('utf8');

                            res.on('data', (chunk) => {

                              let response = helpers.parseJsonToObject(chunk);

                              resolve( response );

                            });
                          });

                          mailgun_req.on('error', (e) =>  {

                            reject(e.message);

                          });

                          mailgun_req.write(mailgun_request_body);
                          mailgun_req.end();

                        });
                   }
}                    

module.exports = mailgun;

