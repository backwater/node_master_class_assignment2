const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');


// Container for lib module methods

let lib = {};


lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = ( dir, file, data, callback ) => {

      helpers.ensureDirectoryExistence(lib.baseDir + dir  + '/' + file );

      fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', (err, fileDescriptor) => {


    if( err ){

      console.log(err);
    }

     // open new file for writing

     if ( !err && fileDescriptor )
     {

     	// Convert data to a string
     	let stringData = JSON.stringify( data );

     	fs.writeFile( fileDescriptor, stringData, ( err ) => {
         
           if( !err )
           {
               fs.close(fileDescriptor, ( err ) => {

               	if( !err )
               	{
               		callback( false ); // ie, error was false, so we have successfully written to file
               	}
               	else
               	{
               		callback({'Error':err});
               	}

               });
           }
           else
           {
           	 callback({'Error': err});
           }

     	});

     }
     else
     {
       callback({'Error':err});
     }

  });

};


lib.read = ( dir, file, callback ) => {

  fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf-8', (err, data) => {

    if( !err && data) {

       let parsedData = helpers.parseJsonToObject(data);

       callback(false,parsedData);
    }
    else
    {

        callback(err,data);
    }
  });
}

// Update data in a file
lib.update = (dir,file,data,callback) => {

  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', (err, fileDescriptor) => {

    if(!err && fileDescriptor){
      // Convert data to string
      let stringData = JSON.stringify(data);

      // Truncate the file
      fs.ftruncate(fileDescriptor, (err) => {
        
        if(!err){
          // Write to file and close it

          fs.writeFile(fileDescriptor, stringData, (err) => {
            
            if(!err){
            
              fs.close(fileDescriptor, (err) => {
                
                if(!err){
                  
                  callback(false);

                } else {

                  callback('Error closing existing file');
                }
              });
            } else {

              callback('Error writing to existing file');
            }
          });
        } else {

          callback('Error truncating file');
        }
      });
    } else {

      callback('Could not open file for updating, it may not exist yet');
    }
  });

};

// Delete a file
lib.delete = (dir,file,callback) => {

  // Unlink the file from the filesystem
  fs.unlink(lib.baseDir+dir+'/'+file+'.json', (err) => {

    callback(err);
  });

};


lib.getUserFromEmail =  ( email ) => {

   return new Promise ( ( resolve, reject ) => {

      lib.read('users', email, ( err, user ) => {

        if( !err ){
   
          resolve(user);
        }
        else
        {
           reject(false);
        }

      });
   });
}


// Export the module

module.exports = lib;