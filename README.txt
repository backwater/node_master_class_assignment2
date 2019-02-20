

//// START SERVER

node index


///// CREATE USER


http://localhost:3000/users

http method: POST



// creating a given user
{
	"firstName":"Jack",
	"lastName":"Smithers",
	"email":"jack@gmail.com",
	"phone":"8473882678",
	"address":"111 E Ocean Street",
	"city":"Chicago",
	"state":"IL",
	"zip":"60302",
	"password":"tester",
	"tosAgreement":true
}

returns:

{
    "Congratulations!": "You have successfully registered as an online customer of Jimmy's Pizzeria!"
}

OR:

{
    "Error": "Missing required fields"
}



/// Note - More user methods listed after token methods


CREATE TOKEN FOR USER  

http://localhost:3000/tokens
 
http method: POST 

{
	"email":"jack@gmail.com",
	"password":"tester"
}


returns: 

{
    "email": "jack@gmail.com",
    "id": "npedbrjkafkqiptfeiee",
    "expires": 1550689874613
}

OR

{
    "Error": "Pw did not match users stored pw"
}
 
OR  ( if email issue )

{
    "Error": "Could not find specified user"
}

/////

GET USER TOKEN


http://localhost:3000/tokens?id=cnhgeqcgobhbmppihagc&email=jack@gmail.com
http method: GET

returns:

{
    "email": "jack@gmail.com",         //success
    "id": "cnhgeqcgobhbmppihagc",
    "expires": 1550690602700
}

OR 

{ 'Error': 'Token not found' } 


/////


UPDATE USER TOKEN


http method: PUT
http://localhost:3000/tokens

{  
    "id": "npedbrjkafkqiptfeiee",
    "extend": true
}

returns : 

{}


OR

{
    "Error": "Token not found or extended."
}

/////


DELETE USER TOKEN

http method: DELETE

http://localhost:3000/tokens?id=npedbrjkafkqiptfeiee

returns

{} //success 

OR 

{
    "Error": "Could not retrieve token to delete"
}


///// 


GET USER

http method: GET

http://localhost:3000/users?email=jack@gmail.com

with valid token in header

RETURNS:

{                            //success
    "firstName": "Jack",
    "lastName": "Nameedit",
    "email": "jack@gmail.com",
    "phone": "8473882678",
    "address": "111 E Ocean Street",
    "city": "Chicago",
    "state": "IL",
    "zip": "60302",
    "tosAgreement": true
}


OR 

{ "Error": "Token or user email is invalid." }


OR

{ 'Error': 'Missing required field' } // missing valid email



/////


/// UPDATE USER:

http method: PUT
http://localhost:3000/users


{                     
	"firstName":"Jack",
	"lastName":"Nameedit",
	"phone":"8473882678",
	"address":"111 E Some New Street",
    "email":"jack@gmail.com" // REQUIRED
}

returns:  

{}  // success

OR

{
    "Error": "Valid email is required."  // if invalid email
}

OR

{
    "Error": "Missing required field."  // no fields submitted
}


/// DELETE USER 

http method: delete

http://localhost:3000/users?email=jack@gmail.com

with valid token in header


returns: 

{} //success 


OR

{ 'Error': 'Could not delete the specified user' }

OR 

{ 'Error': 'Could not find the specified user.' }


OR 

{ 'Error': 'User not authorized to delete.' }

OR 

{ 'Error': 'Missing required field' }




///// GET MENU 


with valid user token *and* email in header

http method: GET

http://localhost:3000/menu



returns: 

menu json object listing food items  //success

OR 

{
    "Error": "Missing required fields"
}

OR 

{ 'Error': 'User failed authentication.' }



/// ORDER FOOD 

http://localhost:3000/order

with valid user token *and* email in header

http method: POST


** The user will need to review the JSON menu ( via http://localhost:3000/menu, ( since there is no front end of application ) and choose the *item numbers* of the particular dish he/she wants to order.

1) The user will put them into a simple array, like this:

["5","7","119"]

2) Then change the url to:  http://localhost:3000/order

3) Paste the array of selected item numbers into the post body


["5","7", "119"]


returns:  //success 

{
    "Please Confirm Your Order:": [
        {
            "item_name": "Caesar Salad: **small**",
            "item_price": "5.99"
        },
        {
            "item_name": "House Salad: **small**",
            "item_price": "4.99"
        },
        {
            "item_name": "Steak Sandwich",
            "item_price": "13.99"
        },
        {
            "Total": "-------------- 24.97"
        },
        {
            "Note": "taxes omitted for demo purposes"
        }
    ]
}


OR

{ 'Error': 'User failed authentication' }

OR

{ 'Error': 'Missing authentication information' }


//// COMPLETE ORDER

 ** Assuming the original order item array is still in the body of the request, 
   ( ["5","7", "119"], and the confirmation json can still be in the response ) and it matches the users intended order,
   the user just needs to change the url from : 


   http://localhost:3000/order 

   TO 

   http://localhost:3000/order-complete

   And POST again. 
  


http://localhost:3000/order-complete
http method: POST



returns:


{                                 //success
    "Order_Status": "Completed",     
    "Receipt_Url": "https://pay.stripe.com/receipts/acct_1Dy0A1JebuRRWNtp/ch_1E60o7JebuRRWNtpah3rC2zk/rcpt_EZ96Xe56s3Inzyh9UEra97YQ0Pkl1rD"
}

* an order email is also sent to user via Mailgun, and a folder is created in orders directory that stores user orders

OR

{
    "Error": "Invalid order"
}

OR 

{
    "Error": "User failed authentication"
}








