const _data = require('./data');

const order = {}; // Container for all the order functions


/*
     Confirm each order item number maps to a menu item. If not, send error msg
     params: selected order item array
     returns: boolean
*/

order.validateOrder = (customerOrder, menu) => {

    let items = [];
    let valid = true;

    customerOrder.forEach((itemNumber) => { 

        let item = order.validateItem(menu, itemNumber);

        if (!item) {

            valid = false;
        }
    });

    return valid;
}

/*
     Confirm/recap customer's selected order items as valid menu choices, plus a total amount due
     params: selected order item array, menu
     returns: json confirmation object
*/

order.confirmOrder = (customerOrder, menu, callback) => {

    let validOrder = order.validateOrder(customerOrder, menu);

    if (validOrder) {

        let total = order.getItemTotal(menu, customerOrder);

        let validated_order = order.summarizeOrder(menu, customerOrder, total); // if order is valid, summarize it

        callback(false, { "Please Confirm Your Order:": validated_order });

    } else {
        callback({ "Error": "One of your order numbers was not valid" });
    }
}


/**

   Loops through menu, gathers chosen items, and totals them
   params: menu, validated order object array, and pre-calculated total
   returns: summarized order for customer confirmation
**/


order.summarizeOrder = (menu, customerOrder, total) => {

    let summarized_customer_order = [];

    for (let k in menu) {
        if (typeof menu[k] === "object" && typeof menu.hasOwnProperty(k)) {

            if (Array.isArray(menu[k])) {

                let item_array = menu[k];

                item_array.forEach((item) => {

                    customerOrder.forEach((ordered_item_number) => {

                        let invalid_item_number = true;

                        if (item.item_number !== undefined && item.item_number == ordered_item_number) {

                            let price = parseFloat(item.price).toFixed(2);
                            let item_name = item.title;

                            let itemObject = { "item_name": item_name, "item_price": price }

                            summarized_customer_order.push(itemObject);

                        }

                        if (item.options !== undefined) {

                            item.options.forEach((option) => {

                                if (option.item_number !== undefined && option.item_number == ordered_item_number) {

                                    let price = (option.price !== undefined) ? parseFloat(option.price).toFixed(2) : '0.00';
                                    let item_name = item.title + ': **' + option.title + '**';

                                    let itemObject = { "item_name": item_name, "item_price": price }

                                    summarized_customer_order.push(itemObject);

                                }

                            });

                        }
                    });
                });

            }
        }
    }

    summarized_customer_order.push({ "Total": "-------------- " + total.toString() });

    summarized_customer_order.push({ "Note": "taxes omitted for demo purposes" });

    return summarized_customer_order;
}



/**
   params: Customer order json object
   returns: human readable string equivalent
**/


order.stringifyOrder = (customerOrder) => {

    let summarized_customer_order = '';
    let orderDescriptionString = '';

    customerOrder.forEach((ordered_item) => {

        if (ordered_item['item_name'] !== undefined && ordered_item['item_price'] !== undefined) {

            orderDescriptionString += ordered_item['item_name'] + ' ------- ' + ordered_item['item_price'] + '\r\n';

        } else {

            for (let key in ordered_item) {

                if (ordered_item.hasOwnProperty(key)) {

                    orderDescriptionString += key + '  ' + ordered_item[key] + '\r\n';

                }
            }
        }
    });

    return orderDescriptionString;
}

/*
   Checks if a given item number maps to an actual menu item
   params: menu data, itemNumber
   returns: menu item Object or undefined if item number is invalid
*/

order.validateItem = (menu, itemNumber) => {

    let price;
    let item_name;
    let itemObject = {};

    for (let k in menu) {
        let item_name = (menu[k].title !== undefined) ? menu[k].title : null;

        if (menu[k].item_number !== undefined && menu[k].item_number == itemNumber) {

            price = parseFloat(menu[k].price).toFixed(2);

            itemObject = { "item_name": item_name, "item_price": price }

            return itemObject;

        } else if (typeof menu[k] === "object") {

            itemObject = order.validateItem(menu[k], itemNumber);

            if (itemObject !== undefined) {

                return itemObject;

            }
        }

    }

}

/* 
    Calculates total for chosen menu items
    params: menu, chosen item numbers
    returns: numeric float

*/

order.getItemTotal = (menu, itemNumbers) => {

    totalArray = itemNumbers.map((itemNumber) => { return order.getCostForItemNumber(menu, itemNumber); });

    let total = totalArray.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

    return total;

}


/* 
    Fetches price for a given item number
    params: menu, chosen item numbers
    returns: numeric float

*/

order.getCostForItemNumber = (menu, itemNumber) => {

    let price;
    let item_name;
    let itemObject = {};

    for (let k in menu) {

        let item_name = (menu[k].title !== undefined) ? menu[k].title : null;

        if (menu[k].item_number !== undefined && menu[k].item_number == itemNumber) {

            price = ( menu[k].price !== undefined ) ? parseFloat(menu[k].price) : 0;

                return price;

        } else if (typeof menu[k] === "object") {

            price = order.getCostForItemNumber(menu[k], itemNumber);

            if (price !== undefined) {

                return price;

            }
        }
    }
}


/*
  Creates an order document in the customer's respective order directory
  params: user object, email object
  returns: resolved or rejected file creation promise

*/

order.createOrderFile = (user, emailObj) => {

    let orderFileCreated = false;
    let date = Date.now().toString();
    let formatted_datestamp = date.replace(/ +/g, "_");
    let order_filename = user.firstName + '_' + user.lastName + '_' + formatted_datestamp;

    return new Promise((resolve, reject) => {

        _data.create('orders/' + user.email, order_filename, emailObj, (err) => {

            if (!err) {

                resolve(true);

            } else {

                reject(err);

            }
        });
    });
}

module.exports = order;