/*
*  Create and export configuration variables
*
*/

// Container for all the environments

const environments = {};

// Staging (default) environment

environments.staging = {
  'httpPort' : 3000,
  'httpsPort' : 3001,
  'envName' : 'staging',
  'hashingSecret' : 'thisIsASecret',
  'stripeKey':'YOUR-STRIPE-KEY',
  'mailGunKey':'YOUR-MAILGUN-KEY', //private key
  'mailGunSandboxDomain':'YOUR-MAILGUN-SANDBOXDOMAIN'

};

// Production environment
environments.production = {
  'httpPort' : 5000,
  'httpsPort' : 5001,
  'envName' : 'production',
  'hashingSecret' : 'thisIsASecret',
  'stripeKey':'YOUR-STRIPE-KEY',
  'mailGunKey':'YOUR-MAILGUN-KEY', //private key
  'mailGunSandboxDomain':'YOUR-MAILGUN-SANDBOXDOMAIN'
};

// Determine which environment was passed as a command-line arugument

const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current enviroment variable is one of the available environments above. If not, default to staging

//var environmentToExport = typeof( environments[currentEnvironment] ) == 'object'  ? environments[currentEnvironment] : environments.staging;
const environmentToExport = typeof( environments[currentEnvironment] ) == 'object'  ? environments.staging : environments.staging;
// just use http for purposes of homework assigniment #2 


// Export the module

module.exports = environmentToExport;