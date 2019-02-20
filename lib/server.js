// Dependencies
const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');//require('debuglog'); //util.debuglog('server'); // <Object> has no method 'debuglog'
const helpers = require('./helpers');
const handlers = require('./handlers');

let server = {};


server.httpServer = http.createServer((req,res) => {

   server.unifiedServer(req,res);
  
});


server.unifiedServer = (req,res) => {

    // Parse the url
  let parsedUrl = url.parse(req.url, true);

  // Get the path
  let path = parsedUrl.pathname;
  let trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  let queryStringObject = parsedUrl.query;

  // Get the HTTP method
  let method = req.method.toLowerCase();

  //Get the headers as an object
  let headers = req.headers;

  // Get the payload,if any
  let decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', (data) => {
      buffer += decoder.write(data);
  });
  req.on('end', () => {
      buffer += decoder.end(); // known as 'capping' the buffer

      // Check the router for a matching path for a handler. If one is not found, use the notFound handler instead.

     let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : server.router.not_found ;

      // Construct the data object to send to the handler
      let data = {
        'trimmedPath' : trimmedPath,
        'queryStringObject' : queryStringObject,
        'method' : method,
        'headers' : headers,
        'payload' : helpers.parseJsonToObject(buffer)
                          // ^  critical ! otherwise you can get new line characters in string like '{\n "FirstName: "Danny"}'
                          // and that will glitch your payload parsing
      };


      // Route the request to the handler specified in the router
      chosenHandler(data, (statusCode,payload) => {

        // Use the status code returned from the handler, or set the default status code to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

        // Use the payload returned from the handler, or set the default payload to an empty object
        payload = typeof(payload) == 'object'? payload : {};

        // Convert the payload to a string
        let payloadString = JSON.stringify(payload);

        res.setHeader('Content-type','application/json');

        // Return the response
        res.writeHead(statusCode);
        res.end(payloadString);

         // If the response is 200, print green, otherwise print red
         if(statusCode == 200){
           debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
         } else {
           debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
         }

      });

  });

};


// Define the request router
server.router = {
  'users' : handlers.users,
  'tokens' : handlers.tokens,
  'menu' : handlers.menu,
  'order' : handlers.order,
  'order-complete': handlers.order_complete,
  'not_found': handlers.not_found
};

// Init script
server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m','The HTTP server is running on port ' + config.httpPort);
  });
}

module.exports = server;

