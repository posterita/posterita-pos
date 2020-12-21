/*
 Copyright (C) 2020 Posterita Ltd
 
 This file is part of Posterita POS.
 
 Posterita POS is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 Posterita POS is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with Posterita POS.  If not, see <http://www.gnu.org/licenses/>.
*/

var APP = {};
APP.callbacks = jQuery.Callbacks();

// APP account settings
APP.DOCUMENT_NO = 0;
APP.TEMP_DOCUMENT_NO = 0;

APP.loadSettings = function(){
	this.SERVER_ENDPOINT_URL = localStorage.getItem('SERVER_ENDPOINT_URL') || "https://my.posterita.com/posteritabo" ;
	this.ACCOUNT_KEY = localStorage.getItem('ACCOUNT_KEY');
	
	this.TERMINAL_KEY = localStorage.getItem('TERMINAL_KEY');
	this.USER_KEY = localStorage.getItem('USER_KEY');
};

APP.setAccountKey = function(key){
	
	/* clear previous settings */
	localStorage.clear();
	
	localStorage.setItem('SERVER_ENDPOINT_URL', this.SERVER_ENDPOINT_URL);
		
	this.ACCOUNT_KEY = key;
	localStorage.setItem('ACCOUNT_KEY', key);
};

APP.setServerEndPointURL = function(url){
	this.SERVER_ENDPOINT_URL = url;
	localStorage.setItem('SERVER_ENDPOINT_URL', url);	
};

APP.getLastUpdated = function(){
	// yyyy-mm-dd HH:mi:ss
	return localStorage.getItem('LAST_UPDATED');
};

APP.getLastUpdatedLocal = function(){
	return localStorage.getItem('LAST_UPDATED_LOCAL') || '';
};

APP.setLastUpdated = function(date){
	// yyyy-mm-dd HH:mi:ss
	localStorage.setItem('LAST_UPDATED', date);
	localStorage.setItem('LAST_UPDATED_LOCAL', moment().format("ddd, Do MMM YYYY, HH:mm:ss"));
}; 

APP.getDatabaseName = function(){
	
	var url = this.SERVER_ENDPOINT_URL;
	
	var index = url.indexOf("://");
	
	url = url.substring(index + 3);
	
	index = url.indexOf("/");
	
	var serveraddress = null; 
	
	if( index <= 0 )
	{		
		serveraddress = url;		
	}
	else
	{
		serveraddress = url.substring(0, index);
	}	
	
	return serveraddress + '/posterita-pos_' + this.ACCOUNT_KEY;
};

APP.setTerminalKey = function(key){
	this.TERMINAL_KEY = key;
	localStorage.setItem('TERMINAL_KEY', key);
	
	var terminal = APP.TERMINAL.getById( APP.TERMINAL_KEY );
	
	var sequence = terminal['sequence'];
	var prefix = terminal['prefix'];	
	var cash_up_sequence = terminal['cash_up_sequence'];
	
	localStorage.setItem('DOCUMENT_NO', sequence);
	localStorage.setItem('DOCUMENT_NO_PREFIX', prefix);
	localStorage.setItem('CASH_UP_DOCUMENT_NO', cash_up_sequence);
};

APP.setUserKey = function(key){
	this.USER_KEY = key;
	localStorage.setItem('USER_KEY', key);
};

APP.signOut = function(){	
	localStorage.removeItem('ACCOUNT_KEY');
	localStorage.removeItem('USER_KEY');
	localStorage.removeItem('TERMINAL_KEY');
	
	this.loadSettings();
}; 

APP.logOut = function(){
	localStorage.removeItem('USER_KEY');
	
	this.loadSettings();
}; 


// APP Database settings
APP.schema = {
		stores: [
		         {
		             name: 'customer',
		             keyPath: "customer_id"
		         }, 
		         {
		             name: 'product',
		             keyPath: 'product_id'
		         },
		         {
		             name: 'productcategory',
		             keyPath: 'productcategory_id',
		         }, 
		         {
		             name: 'tax',
		             keyPath: 'tax_id'
		         }, 
		         {
		             name: 'terminal',
		             keyPath: 'terminal_id'
		         }, 
		         {
		             name: 'store',
		             keyPath: 'store_id'
		         }, 
		         {
		             name: 'user',
		             keyPath: 'user_id'
		         }, 
		         {
		             name: 'order',
		             keyPath: 'order_id',
		             autoIncrement: true,
		             indexes: [{keyPath: "issync"}, {keyPath: "uuid"}, {keyPath: "dateordered"}]
		         },
		         {
		             name: 'till',
		             keyPath: 'till_id',
		             autoIncrement: true,
		             indexes: [{keyPath: "uuid"}, {keyPath: "openingdate"}]
		         },
		         {
		             name: 'modifier',
		             keyPath: 'modifier_id'
		         },
		         {
		             name: 'cayan',
		             keyPath: 'cayan_id'
		         },
		         {
		             name: 'cayansite',
		             keyPath: 'cayansite_id'
		         },
		         
		         {
		             name: 'integration',
		             keyPath: 'integration_id'
		         },
		         
		         {
		             name: 'account',
		             keyPath: 'account_id'
		         }
		         
		  ]
};

APP.isFirstTime = true;

APP.initializeDB = function(){
	
	var dfd = new jQuery.Deferred();
	
	var dbName = APP.getDatabaseName();
	
	var db = new ydn.db.Storage( dbName, APP.schema );
	
	db.addEventListener('ready', function (event) {
		  var is_updated = event.getVersion() != event.getOldVersion();
		  if (is_updated) {
		    console.log('database connected with new schema');
		  } else if (isNaN(event.getOldVersion()))  {
		    console.log('new database created');
		  } else {
		    console.log('existing database connected');
		    
		    APP.isFirstTime = false;
		    
		  }
		  
		  
		  /* successfully connected to db */
		 console.log('Database ' + db.getName() + ' version ' + event.getVersion() + ' [' + db.getType() + '] ready.');
		 dfd.resolve('Successfully connected to db -- ' + db.getName());
	});
	
	db.addEventListener('fail', function (event) {
		  var err = event.getError();
		  console.log('connection failed with ' + err.name + ' by ' + err.message);
		  db = null; // no operation can be placed to the database instance
		  
		  dfd.reject('connection failed with ' + err.name + ' by ' + err.message);
	});
	
	this.db = db;
	
	
	return dfd.promise();
	
};


APP.synchronizeDB = function(){
	
	var dfd = new jQuery.Deferred();
	
	dfd.notify( 'requesting data ...' );
	
	//pull data
	APP.pullData().done( function ( data ){
		
		dfd.notify( 'importing data ...' );
					
		//import data
		APP.importData( data ).done( function ( msg ){
			
			dfd.notify( 'synchronization completed.' );
			dfd.resolve( 'synchronization completed.' );			
						
			
		}).fail( function ( e ){
			//failed to import data
			dfd.reject( e );
			
		});
		
		
	}).fail( function ( e ){
		// failed to pull data
		dfd.reject( e );
		
	});
	
	return dfd.promise();
	
};


/*APP.pullData().done(function(json){console.log(json);}).fail(function(msg){console.log(msg);});*/
APP.pullData = function(){			
	return DatabaseService.requestUpdates();	
};

APP.importData = function ( data ){
	
	var dfd = new jQuery.Deferred();
	
	var last_updated = APP.getLastUpdated();
	
	var resetDB = false;
	
	if( last_updated == null){
		
		resetDB = true;
	}
	
	if(data['sync_date'])
	{
		var sync_date = data['sync_date'];
		
		APP.setLastUpdated( sync_date );
	}
	
	var tables = [ "user", "customer", "product", "productcategory", "tax", "store", "terminal" , "modifier", "cayan", "cayansite", "integration", "account" ];
	  
	  var table;
	  var records;
	  var promise;
	  
	  // jquery promise array
	  var promises = [];
	  var db = this.db;
	  
	  for(var i=0; i<tables.length; i++){
		  
		  table = tables [ i ];
		  records = data [ table ];
		  
		  promise = (function(table, records) {
		      
			  var dfd = new jQuery.Deferred();
			  
			  console.log('importing table ==> ' + table);
			  
			  //table product
			  if( table == 'product' && resetDB == false ){
				  
				  db.putAll( table, records ).done(function(){
					  dfd.resolve('inserted ' + records.length + ' records in table ==> ' + table);
					  
				  }).fail(function(e){
					  console.error(e);
					  dfd.reject('Failed to put data in table ==> ' + table);
				  });
			  }
			  else
			  {
				//clear previous values
				  db.clear( table ).done(function(){
					  console.log('cleared table ==> ' + table);
					  
					  db.putAll( table, records ).done(function(){
						  dfd.resolve('inserted ' + records.length + ' records in table ==> ' + table);
						  
					  }).fail(function(e){
						  console.error(e);
						  dfd.reject('Failed to put data in table ==> ' + table);
					  });
					  
				  }).fail(function(e){
					  console.error(e);
					  dfd.reject('Failed to clean table ==> ' + table);
				  }); 
			  }			  
			  
			  return dfd.promise();
			  
		    })( table, records );	
		  
		  promises.push( promise );
		  
	  }// for
	  
	  jQuery.when.apply(jQuery, promises).done(function() {        
	        for (var i = 0, j = arguments.length; i < j; i++) {
	        	if(arguments[i]) console.log(arguments[i]);
	        }
	        
	        dfd.resolve('import data completed.');
	        
	    }).fail(function() {        
	        for (var i = 0, j = arguments.length; i < j; i++) {
	        	if(arguments[i]) console.error(arguments[i]);
	        }
	        
	        dfd.reject('Failed to import data!');
	    });
	  
	  
	  return dfd.promise();
	
	
};


APP.initCache = function(){
	
	var CACHE = {
			
			initialize : function(){
				
				var dfd = new jQuery.Deferred();
				
				var table = this.tablename;
				var cache = this;
				
				dfd.notify('[' + table + '] caching');
				
				if( table == "order"){
					
					APP.db.from( table ).reverse().list( 5000 ).done(function(records) { 
						cache.cache = TAFFY(records);
						dfd.resolve('[' + cache.tablename + '] Cached ' + records.length + ' records.');
					});
					
				}
				else if( table == "till"){
					
					APP.db.from( table ).reverse().list( 10 ).done(function(records) { 
						cache.cache = TAFFY(records);
						dfd.resolve('[' + cache.tablename + '] Cached ' + records.length + ' records.');
					});
				}
				else 
				{
					APP.db.values( table, null, 30000 ).done(function(records){
						cache.cache = TAFFY(records);
						dfd.resolve('[' + cache.tablename + '] Cached ' + records.length + ' records.');
				    });
				}	
				/*
				
				APP.db.values( table, null, 30000 ).done(function(records){
					cache.cache = TAFFY(records);
					dfd.resolve('[' + cache.tablename + '] Cached ' + records.length + ' records.');
			    });
			    */
				
				return dfd.promise();
			},
			
			getAll : function(){
				
				return this.cache({}).get();
				
			},
			
			search : function (query){
				return this.cache(query).get();
			},
			
			getById : function( id ){
								
				if(id == null){
					
					return null;
				}
				
				var keyName = this.tablename + '_id';
				
				var query = {};
				
				query[ keyName ] = {'==' : id };
				
				var record = this.cache( query ).first();
				
				if( !record ){
					
					return null;
				}
				
				return jQuery.extend({}, record);
				
			},
			
			remove : function (id) {
				
				var dfd = new jQuery.Deferred();
				
				var table = this.tablename;
				var cache = this;
				
				APP.db.remove( table, id ).done(function( count ){
					
					/* remove from cache */
					var query = {};
					
					var keyName = cache.tablename + '_id';
					query[ keyName ] = {'==' : id };
					
					cache.cache( query ).remove();
					
					dfd.resolve('[' + cache.tablename + '] Deleted ' + count + ' records.');
					
			    });					
				
				
				return dfd.promise();
			}
	};
	
	this.ACCOUNT = jQuery.extend({
		tablename : 'account'
	}, CACHE);

	this.PRODUCT = jQuery.extend({
		tablename : 'product',
		
		saveProduct : function( product ){
			
			var dfd = new jQuery.Deferred();
			
			ProductService.update( product ).done(function( result ){
				
				APP.db.put('product', result).done(function( product_id ){
					
					var p = APP.PRODUCT.getById( product_id );
					
					if(p == null){
							
						APP.PRODUCT.cache.insert(result);	
						msg = '[PRODUCT] saved #' + product_id;
					}
					else
					{
						APP.PRODUCT.cache({'product_id':product_id}).update(result);
						msg = '[PRODUCT] updated #' + product_id;
					}
										
					dfd.resolve(result, msg);
					
				}).fail(function(e) {
					dfd.reject('[PRODUCT] failed to save product. ' + e);
				});
								
				
			}).fail(function(e){
				dfd.reject(e);
			});
			
			return dfd.promise();
		}
		
	}, CACHE);

	this.PRODUCT_CATEGORY = jQuery.extend({
		tablename : 'productcategory'
	}, CACHE);

	this.TAX = jQuery.extend({
		tablename : 'tax'
	}, CACHE);

	this.USER = jQuery.extend({
		tablename : 'user'
	}, CACHE);

	this.CUSTOMER = jQuery.extend({
		tablename : 'customer',
		
		saveCustomer : function( customer ){
			
			var dfd = new jQuery.Deferred();
			
			CustomerService.update( customer ).done(function( result ){
				
				APP.db.put('customer', result).done(function( customer_id ){
					
					var c = APP.CUSTOMER.getById( customer_id );
					
					if(c == null){
							
						APP.CUSTOMER.cache.insert(result);	
						msg = '[CUSTOMER] saved #' + customer_id;
					}
					else
					{
						APP.CUSTOMER.cache({'customer_id':customer_id}).update(result);
						msg = '[CUSTOMER] updated #' + customer_id;
					}
										
					dfd.resolve(result, msg);
					
				}).fail(function(e) {
					dfd.reject('[CUSTOMER] failed to save customer. ' + e);
				});
								
				
			}).fail(function(e){
				dfd.reject(e);
			});
			
			return dfd.promise();
		}
	
	}, CACHE);
	
	this.TERMINAL = jQuery.extend({
		tablename : 'terminal'
	}, CACHE);
	
	this.STORE = jQuery.extend({
		tablename : 'store'
	}, CACHE);
	
	this.CAYAN = jQuery.extend({
		tablename : 'cayan'
	}, CACHE);
	
	this.CAYANSITE = jQuery.extend({
		tablename : 'cayansite'
	}, CACHE);
	
	this.INTEGRATION = jQuery.extend({
		tablename : 'integration'
	}, CACHE);
	
	this.MODIFIER = jQuery.extend({
		tablename : 'modifier',
		getByProductCategoryId : function( id ){
			
			if(id == null){
				
				return null;
			}
			
			var keyName = 'productcategory_id';
			
			var query = {};
			
			query[ keyName ] = {'==' : id };
			
			var records = this.cache( query ).get();
			
			return records;
			
		}
		
	}, CACHE);
	
	this.ORDER = jQuery.extend({
		
		tablename : 'order',
			
		saveOrder : function( order ){
			
			var dfd = new jQuery.Deferred();
			
			APP.db.put('order', order).done(function(key){
				
				APP.db.get('order', key).done(function(result){
					
					var order_id = result.order_id;
					
					var o = APP.ORDER.getById( order_id );
					if(o == null){
							
						APP.ORDER.cache.insert(result);	
						msg = '[ORDER] saved #' + order_id;
					}
					else
					{
						APP.ORDER.cache({'order_id':order_id}).update(result);
						msg = '[ORDER] updated #' + order_id;
					}
										
					dfd.resolve(result, msg);							
											
					
				}).fail(function(e){
					dfd.reject('[ORDER] failed to load saved order. ' + e);
				});
				
			}).fail(function(e) {
				dfd.reject('[ORDER] failed to save order. ' + e);
			});
			
			return dfd.promise();
		}
	
	}, CACHE);
	
	this.TILL = jQuery.extend({
		
		tablename : 'till',
			
		saveTill : function( till ){
			
			var dfd = new jQuery.Deferred();
			
			APP.db.put('till', till).done(function(key){
				
				APP.db.get('till', key).done(function(result){
					
					var till_id = result.till_id;
					
					var o = APP.TILL.getById( till_id );
					if(o == null){
							
						APP.TILL.cache.insert(result);	
						msg = '[TILL] saved #' + till_id;
					}
					else
					{
						APP.TILL.cache({'till_id':till_id}).update(result);
						msg = '[TILL] updated #' + till_id;
					}
										
					dfd.resolve(result, msg);							
											
					
				}).fail(function(e){
					dfd.reject('[TILL] failed to load saved till. ' + e);
				});
				
			}).fail(function(e) {
				dfd.reject('[TILL] failed to save till. ' + e);
			});
			
			return dfd.promise();
		}
	
	}, CACHE);
	
	
	var dfd = new jQuery.Deferred();
	
	jQuery.when (
			
			APP.ACCOUNT.initialize(),
			APP.PRODUCT.initialize(),
			APP.PRODUCT_CATEGORY.initialize(),
			APP.TAX.initialize(),
			APP.USER.initialize(),
			APP.CUSTOMER.initialize(),
			APP.TERMINAL.initialize(),
			APP.STORE.initialize(),
			APP.ORDER.initialize(),
			APP.TILL.initialize(),
			APP.MODIFIER.initialize(),
			APP.INTEGRATION.initialize()
			
			).done(function(){
				
				for (var i = 0, j = arguments.length; i < j; i++) {
		        	if(arguments[i]) console.log(arguments[i]);
		        }
				
				dfd.resolve("Caching completed");				
				APP.callbacks.fire('Caching completed');
				
			}).fail(function(){
				
				dfd.reject("Caching failed!");
			});
	
	return dfd.promise();
};

APP.ready = function( callback ){	
	this.callbacks.add(callback);	
};


APP.voidOrder = function ( order_id ) {
	
	var order = APP.ORDER.getById( order_id );
	var uuid = order["uuid"];
	
	/* set status to voided */
	order.status = "VO";
	
	/* reset synchronization status */
	order.syncstatus = null;
	order.issync = 'N';
	
	var dfd = new jQuery.Deferred();
	
	
	APP.ORDER.saveOrder(order).done(function(order, msg){
		
		console.log(msg);
		dfd.resolve();		
		
	}).fail(function(msg){
		console.log(msg);
		
		APP.showError(msg, 'Void Order Error');
		dfd.reject(msg);
	});
	
	return dfd.promise();
};

APP.holdOrder = function ( customer, cart, order_id, uuid ) {
	
	var terminal_id = APP.TERMINAL_KEY;
	var terminal = APP.TERMINAL.getById(terminal_id);	
	
	var user_id = APP.USER_KEY;
	var till_id = APP.TILL_KEY;
	
	var store_id = 0;	
	store_id = terminal['store_id'];
	
	var account_id = 0;
	account_id = terminal['account_id'];
	
	var customer_id = 0;
	var customer_name = "";
	
	if(customer){
		customer_id = customer['customer_id'];
		customer_name = customer['name'];
	}
	
	//set date as long
	var date = new Date().getTime();
	var dateordered = date;
	var datepaid = date;
	
	var documentno =  ++ APP.TEMP_DOCUMENT_NO;
	
	// assign uuid
	var uuid = APP.UTILS.UUID.getUUID();
	
	var order = {
		/* synchronization fields */
		'o_order_id' : 0, /* online order id*/
		'issync' : 'N', /* flag whether order is sync */
		
		'account_id' : account_id,
	    'store_id': store_id,
	    'terminal_id': terminal_id,
	    'user_id': user_id,
	    'customer_name' : customer_name,
	    'customer_id': customer_id,
	    'till_id' : till_id,
	    status: "DR",
	    comment: '',
	    grandtotal: cart.grandtotal,
	    costtotal: cart.costtotal,
	    taxtotal: cart.taxtotal,
	    subtotal: cart.subtotal,
	    qtytotal: cart.qtytotal,
	    tipamt: 0,
	    discountamt: 0,
	    ispaid: 'N',
	    'dateordered': dateordered,
	    'documentno': documentno,
	    lines: [],
	    payments: [],
	    note: cart.note
	};
	
	// assign uuid
	if ( uuid ) {
		order["uuid"] = uuid;
	}
	else
	{
		order["uuid"] = APP.UTILS.UUID.getUUID();
	}
	
	if(order_id) {
		order["order_id"] = order_id;
	}
	
	//add lines
	order.lines = APP.UTILS.ORDER.getOrderLinesFromCart( cart );	
	
	order.paymenttype = 'CASH';
	
	var dfd = new jQuery.Deferred();
	
	APP.ORDER.saveOrder(order).done(function(order, msg){
		
		console.log(msg);
		dfd.resolve();		
		
	}).fail(function(msg){
		console.log(msg);
		
		APP.showError(msg, 'Hold Order Error');
		dfd.reject(msg);
	});
	
	return dfd.promise();
	
};

APP.checkout = function( customer, cart, payments, order_id, uuid ){
	
	var terminal_id = APP.TERMINAL_KEY;
	var terminal = APP.TERMINAL.getById(terminal_id);
	var terminal_name = terminal['name'];
	
	var user_id = APP.USER_KEY;
	var user = APP.USER.getById( user_id );
	var user_name = user['username'];
	
	var till_id = APP.TILL_KEY;	
	var till = APP.TILL.getById( till_id );
	var till_uuid = till['uuid'];
	
	var store_id = 0;
	var store_name = null;
	
	store_id = terminal['store_id'];
	var store = APP.STORE.getById(store_id);
	store_name = store['name'];
	
	var account_id = 0;
	account_id = terminal['account_id'];	
	var account = APP.ACCOUNT.getById(account_id);
	
	var customer_id = 0;
	var customer_name = 'Walk-in Customer';
	
	if(customer){
		customer_id = customer['customer_id'];
		customer_name = customer['name'];
	}
	
	//set date as long
	var date = moment();	
	var dateordered = date.valueOf();
	var dateorderedtext = date.format('DD-MM-YYYY HH:mm:ss');
	var dateorderedfull = date.format("ddd, Do MMM YYYY, h:mm:ss");
	
	var datepaid = date;
	
	var documentno =  APP.UTILS.ORDER.getDocumentNo();
	
	var order = {	
			
		/* synchronization fields */
		'o_order_id' : 0, /* online order id*/
		'issync' : 'N', /* flag whether order is sync */
		
		'account' : account,
		
		'account_id' : account_id,
		
		'store_name' : store_name,
	    'store_id': store_id,
	    
	    'terminal_name' : terminal_name,
	    'terminal_id': terminal_id,
	    
	    'user_name' : user_name,
	    'user_id': user_id,
	    
	    'customer_name' : customer_name,
	    'customer_id': customer_id,
	    
	    'till_id' : till_id,
	    'till_uuid' : till_uuid,
	    'location' : till.location,
	    status: "CO",
	    note: cart.note,
	    grandtotal: cart.grandtotal,
	    costtotal: cart.costtotal,
	    taxtotal: cart.taxtotal,
	    subtotal: cart.subtotal,
	    qtytotal: cart.qtytotal,	    
	    ispaid: 'Y',
	    'dateordered': dateordered,
	    'dateorderedtext' : dateorderedtext,
	    'dateorderedfull' : dateorderedfull,
	    'documentno': documentno,
	    lines: [],
	    payments: [],
	    
	    tipamt: 0,
	    discountamt: cart.discounttotal,
	    cashback: 0,
	    donation: 0,
	    surcharge: 0,
	    discounts : [],
	    
	    //RA Cellular
	    vouchers : APP.UTILS.ORDER.getVouchersFromCart( cart )
	};
	
	// assign uuid	
	if ( uuid ) {
		order["uuid"] = uuid;
	}
	else
	{
		order["uuid"] = APP.UTILS.UUID.getUUID();
	}	
	
	
	if(order_id) {
		order["order_id"] = order_id;
	}
	
	//add lines
	order.lines = APP.UTILS.ORDER.getOrderLinesFromCart( cart );
	
	var cash = 0;
	var change = 0;
	
	order.change = 0;
	order.tendered = 0;
	
	if( payments.length > 1){
		
		order.paymenttype = 'MIXED';
	}
    else
    {
    	order.paymenttype = payments[0].type;
    }
	
	for(var i=0; i<payments.length; i++)
	{
		
		var payment = payments[i];
		
		if( payment.type == 'CASH' ){
			
			order.tendered += payment.tendered || 0;
		}
		
		payment['datepaid'] = dateordered;
		payment['documentno'] =  documentno;
		payment['status'] =  'CO';
		payment['paymenttype'] =  payment.type;
		
		payment.change = payment.change || 0;
		
		if(payment.AdditionalParameters)
		{
			
			var AmountDetails = payment.AdditionalParameters['AmountDetails'] || {};
			
			var tip = AmountDetails['UserTip'] || 0;
			var cashback = AmountDetails['Cashback'] || 0;
			var donation = AmountDetails['Donation'] || 0;
			var surcharge = AmountDetails['Surcharge'] || 0;
			var discount =  AmountDetails['Discount'] || {};
			
			order.tipamt += parseFloat( tip );
			
			order.cashback += parseFloat( cashback );
			order.donation += parseFloat( donation );
			order.surcharge += parseFloat( surcharge );
			
			var discounts  = discount['DiscountsApplied'];
			
			if(discounts)
			{				
				for(var i=0; i<discounts.length; i++)
				{					
					order.discounts.push(discounts[i]);					
				}
			}
			
			
		}
		
		payment.change = payment.change + order.cashback;		
		payment['payamt'] =  payment.amount;
		
		order.payments.push( payment );		
		
		order.change = order.change + payment.change;		
	}
	   
	
	var dfd = new jQuery.Deferred();
	
	APP.ORDER.saveOrder(order).done(function(order, msg){
		
		if(APP.PRINTER_SETTINGS.isPrinterEnabled()){
			//print receipt
			
			APP.printOrder( order ).done(function(msg){
				
				dfd.resolve( order );
				
			}).fail(function(error){			
				APP.showError(error, 'Printer Error');
				/*dfd.reject(error);*/
				
				dfd.resolve( order );
				
			});
		}
		else
		{
			console.log(msg);
			dfd.resolve( order );
			/*
			var format = PrinterManager.getReceiptPrintFormat( order, false );
			var html = HTMLPrinter.getHTML(format);
			console.log( html );
			*/
		}	
		
	}).fail(function(msg){
		console.log(msg);
		
		APP.showError(msg, 'Order Error');
		dfd.reject(msg);
	});
	
	return dfd.promise();
};

APP.printOrder = function( order, reprint ){
			
	if(APP.PRINTER_SETTINGS.isPrinterEnabled())
	{		
		var dfd = new jQuery.Deferred();		

		modal.hide();
		
		ons.notification.confirm({
			  message: 'Do you want to print invoice?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Confirmation',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
				  
				format = [];
				  
			    if(index == 1){			    	
					
					 /* RA Cellular */
				    if( order.vouchers && order.vouchers.length > 0 ){
				    	
				    	/* add reprint */
					    if(reprint && reprint == true){
					    	
					    	format.push(['FEED']);
					    	format.push(['CENTER']);
					    	format.push(['H1', '*** REPRINT ***']);
					    }				    	

				    	var voucher = null;
				    	
				    	format.push(['FEED']);

				    	for(var i=0; i<order.vouchers.length; i++){

				    		voucher = order.vouchers[i];
				    		format.push(['BASE64', voucher ]);

				    	}
				    	
				    	if(APP.PRINTER_SETTINGS.isDrawerEnabled()){
				    		
				    		format.push(['OPEN_DRAWER']);
					    	format.push(['FEED']);				    		
				    	}
				    	
				    	format.push(['PAPER_CUT']);

				    }
				    else
				    {
				    	if(APP.PRINTER_SETTINGS.isDrawerEnabled() && order.grandtotal != 0 ){
				    		
				    		format.push(['OPEN_DRAWER']);
					    	format.push(['FEED']);				    		
				    	}
				    	
				    	dfd.resolve();
				    }			    			    	
			    }
			    else
			    {   
			    	format = PrinterManager.getReceiptPrintFormat( order, APP.PRINTER_SETTINGS.isDrawerEnabled(), reprint );
					
					if(APP.PRINTER_SETTINGS.isKitchenPrinterEnabled())
					{
						var kitchenFormat = PrinterManager.getKitchenReceiptPrintFormat( order, false );
						
						format = format.concat(kitchenFormat);
					}
					
					/* add reprint */
				    if(reprint && reprint == true){
				    	
				    	var tmp = [];
				    	
				    	tmp.push(['FEED']);
				    	tmp.push(['CENTER']);
				    	tmp.push(['H1', '*** REPRINT ***']);
				    	
				    	format = tmp.concat( format );
				    }
			    }
			    
			    if( format.length == 0 ){
			    	dfd.resolve();
			    	return;
			    }
			       
			    
			    PrinterManager.print(format).done(function(){
			    	
			    	dfd.resolve();
			    	
			    }).fail(function(){
			    	
			    	dfd.reject();
			    	
			    });
			    
			  }
		});	
		
		return dfd.promise();
		
	}
	else
	{	
		var dfd = new jQuery.Deferred();
		dfd.resolve('Please enable printing in settings.');
		return dfd.promise();
	}	
	
};

APP.printDeclineEMV = function( response ){
	
	if(APP.PRINTER_SETTINGS.isPrinterEnabled())
	{
		var format = PrinterManager.getEMVErrorReceiptPrintFormat( response );	
		
		return PrinterManager.print( format );
	}
	else
	{	
		var format = PrinterManager.getEMVErrorReceiptPrintFormat( response );
		var html = HTMLPrinter.getHTML(format);
		console.log( html );
		
		var dfd = new jQuery.Deferred();
		dfd.resolve();
		return dfd.promise();
	}
	
};

APP.printTill = function( till ){
	
	if(APP.PRINTER_SETTINGS.isPrinterEnabled())
	{
		var format = PrinterManager.getTillPrintFormat( till );
		
		return PrinterManager.print( format );
	}
	else
	{
		var dfd = new jQuery.Deferred();
		dfd.resolve();
		return dfd.promise();
	}	
	
};

APP.showError = function(msg, title){
	
	ons.notification.alert({
		  'message': msg,
		  // or messageHTML: '<div>Message in HTML</div>',
		  'title': title,
		  buttonLabel: 'OK',
		  animation: 'default', // or 'none'
		  // modifier: 'optional-modifier'
		  callback: function() {
		    // Alert button is closed!	
			
		  }
		});
}

APP.UTILS = {};
APP.UTILS.UUID = {
		getUUID : function(){
			var length = 24;
			if(arguments.length > 0){
				length = parseInt(arguments[0]);
			}
			
			var uuid = "", i, random;
			for (i = 0; i < length; i++) {
				random = Math.random() * 16 | 0;

				/*
				if (i == 4 || i == 8 || i == 12 || i == 16 || i == 20) {
					uuid += "-"
				}
				*/
				
				uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
			}
			return uuid;
		}
};

APP.UTILS.ORDER = {
		
		getDocumentNo : function(){
			
			/*
			var today = moment().startOf('day').valueOf();	
			var count = APP.ORDER.search({status : ['CO','VO'], dateordered : {'>' : today}}).length;
			
			var documentNo = (count + 1) + '';
			
			var padding = "00000";
			
			padding = padding.substr(0, padding.length - documentNo.length);
			
			documentNo = padding + documentNo;
			*/
			
			var number = localStorage.getItem('DOCUMENT_NO') || '-1';
			var prefix = localStorage.getItem('DOCUMENT_NO_PREFIX') || '';
			
			number = parseInt(number);
			
			if(number < 0){
				
				var terminal = APP.TERMINAL.getById( APP.TERMINAL_KEY );
				number = terminal['sequence'] || "0";
				prefix = terminal['prefix'];	
				
				localStorage.setItem('DOCUMENT_NO_PREFIX', prefix);
			}
			
			localStorage.setItem('DOCUMENT_NO', parseInt(number) + 1);
			
			var documentNo = localStorage.getItem('DOCUMENT_NO');
			
			var padding = "000000000";
			
			padding = padding.substr(0, padding.length - documentNo.length);
			
			documentNo = prefix + padding + documentNo;
			
			return documentNo;
			
		},
		
		getNextDocumentNo : function(){
			
			var number = localStorage.getItem('DOCUMENT_NO') || '-1';
			var prefix = localStorage.getItem('DOCUMENT_NO_PREFIX') || '';
			
			number = parseInt(number);
			
			if(number < 0){
				
				var terminal = APP.TERMINAL.getById( APP.TERMINAL_KEY );
				number = terminal['sequence'] || "0";
				prefix = terminal['prefix'];	
				
				localStorage.setItem('DOCUMENT_NO_PREFIX', prefix);
			}
			
			var documentNo = "" + (parseInt(number) + 1);
			
			var padding = "000000000";
			
			padding = padding.substr(0, padding.length - documentNo.length);
			
			documentNo = prefix + padding + documentNo;
			
			return documentNo;
			
		},
		
		getCurrentDocumentNo : function(){
			
			var number = localStorage.getItem('DOCUMENT_NO') || '-1';
			var prefix = localStorage.getItem('DOCUMENT_NO_PREFIX') || '';
			
			number = parseInt(number);
			
			if(number < 0){
				
				var terminal = APP.TERMINAL.getById( APP.TERMINAL_KEY );
				number = terminal['sequence'] || "0";
				prefix = terminal['prefix'];	
				
				localStorage.setItem('DOCUMENT_NO_PREFIX', prefix);
			}
			
			var documentNo = "" + (parseInt(number));
			
			var padding = "000000000";
			
			padding = padding.substr(0, padding.length - documentNo.length);
			
			documentNo = prefix + padding + documentNo;
			
			return documentNo;
			
		},
		
		getCashUpDocumentNo : function(){
			
			var number = localStorage.getItem('CASH_UP_DOCUMENT_NO') || '-1';
			var prefix = localStorage.getItem('DOCUMENT_NO_PREFIX') || '';
			
			number = parseInt(number);
			
			if(number < 0){
				
				var terminal = APP.TERMINAL.getById( APP.TERMINAL_KEY );
				number = terminal['cash_up_sequence'] || "0";
				prefix = terminal['prefix'];	
				
				localStorage.setItem('DOCUMENT_NO_PREFIX', prefix);
			}
			
			localStorage.setItem('CASH_UP_DOCUMENT_NO', parseInt(number) + 1);
			
			var documentNo = localStorage.getItem('CASH_UP_DOCUMENT_NO');
			
			var padding = "000000000";
			
			padding = padding.substr(0, padding.length - documentNo.length);
			
			documentNo = prefix + padding + documentNo;
			
			return documentNo;
		},
		
		getVouchersFromCart : function(cart){
			
			var vouchers = [];
			
			var lines = cart.getLines();
			
			for(var i=0; i<lines.length; i++){
							
				var line = lines[i];
				
				if(line.printString){
					
					vouchers.push( line.printString );					
				}
			}
			
			return vouchers;
		},
		
		getOrderLinesFromCart : function(cart){
			
			var orderlines = [];
			
			var lines = cart.getLines();			
			
			for(var i=0; i<lines.length; i++){
				
				var line = lines[i];
				
				var orderline = {
			        product_id: line.product_id,
			        tax_id: line.tax.tax_id,
			        name : line.product.name,			        
			        description: line.product.description,
			        qtyentered: line.qty,
			        priceentered: line.price,
			        priceactual: line.product.sellingprice,
			        lineamt: line.lineAmt,
			        linenetamt: line.lineNetAmt,
			        taxamt: line.taxAmt,
			        costamt: line.costAmt,
			        ismodifier: 'N',
			        isbom: 'N',
			        note: line.note,
			        enabletax : line.enableTax,			        			        
			        modifiers : [],
			        
			        gift : line.gift,
			        voucher : line.printString || null,
			        
			        isstock: line.product.isstock,
			        
			        discountamt : line.discountAmt,
			        discountpercentage : line.discountPercentage
			    };
				
				var modifiers = [];
				
				var modifierline = null;
				var modifierlines = line.getModifiers();
				
				for(var j=0; j < modifierlines.length; j++){
					
					modifierline = modifierlines[j];
					
					var modifierOrderLine = {
							modifier_id: modifierline.product_id,
					        product_id: modifierline.product_id,
					        tax_id: modifierline.tax.tax_id,
					        name : modifierline.product.name,
					        description: modifierline.product.description,
					        qtyentered: modifierline.qty,
					        priceentered: modifierline.price,
					        priceactual: modifierline.product.sellingprice,
					        lineamt: modifierline.lineAmt,
					        linenetamt: modifierline.lineNetAmt,
					        taxamt: modifierline.taxAmt,
					        costamt: modifierline.costAmt,
					        ismodifier: 'Y',
					        isbom: 'N',
					        note: modifierline.note,
					        enabletax : modifierline.enableTax,
					    };
					
					orderline.modifiers.push( modifierOrderLine );
				}
				
				orderlines.push( orderline );
			}
			
			return orderlines;
		}
};

APP.SYNC_STATUS = {
		QUEUED : 'queued',
		SYNCHRONIZED : 'synchronized',
		ERROR : 'error'
};

APP.synchronizeOrders = function(){
	
	/* get all orders that need to be sync */
	var orders = APP.ORDER.search({
		issync:'N',
		status:["CO","VO"]
	});
	
	/* check if till is close */
	var till_id = APP.TILL_KEY;
	var till = APP.TILL.getById( till_id );
	
	var temp = [];
	var order = null;
	
	for(var i=0; i<orders.length; i++){
		
		order = orders[i];
		
		if(order.till_id == till_id && till.closingdate == null){
			continue;
		}
		
		temp.push( order );
	}
	
	
	var dfd = new jQuery.Deferred();
	
	if( temp.length == 0) {
		
		dfd.resolve('orders sync complete.');
		
		return dfd.promise();
	}
	
	/* use order service to post orders */
	OrderService.sync( temp ).done(function(results){
		
		var result = null;
		var uuid,status,error,online_id;
		
		var order = null;
		
		var promises = [];
		
		for(var i=0; i<results.length; i++){
			
			result = results[i];			
			
			uuid = result['uuid'];
			status = result['status'];
			
			order = APP.ORDER.search({'uuid':uuid})[0];
			
			order.syncstatus = status;
			
			switch( status ){		
			
				case APP.SYNC_STATUS.QUEUED : 
					
					order.issync = 'N';
					
					break;
				
				case APP.SYNC_STATUS.ERROR : 
					
					error = result['error'];
					
					order.syncerror = error;
					order.issync = 'Y';
					
					break;
				
				case APP.SYNC_STATUS.SYNCHRONIZED : 
					
					online_id = result['online_id'];
					order.online_id = online_id;	/* online order id */
					order.issync = 'Y';
					
					break;
					
				default:
					
					console.error('Invalid status ==> ' + status);
					
					break;
			}
			
			if( order.issync == 'Y' ){
				
				var promise = APP.ORDER.saveOrder( order );	
				promises.push( promise );							
			}
			else
			{
				console.log( '#' + uuid + ' queued' );
			}			
			
		}//for
		
		jQuery.when.apply( jQuery, promises ).done(function() {        
	        for (var i = 0, j = arguments.length; i < j; i++) {
	        	if(arguments[i]) console.log(arguments[i]);
	        }
	        
	        dfd.resolve('orders sync complete.');
	        
	    }).fail(function() {        
	        for (var i = 0, j = arguments.length; i < j; i++) {
	        	if(arguments[i]) console.error(arguments[i]);
	        }
	        
	        dfd.reject('Failed to sync orders!');
	    });
		
		
		}).fail(function(error){
			console.error(error);
		});
	
	return dfd.promise();
};

APP.synchronizeTills = function(){
	
	/* get all tills that need to be sync */
	var tills = APP.TILL.search({
		issync : 'N',
		closingdate : { isNull : false }
	});
	
	var dfd = new jQuery.Deferred();
	
	if( tills.length == 0) {
		
		dfd.resolve('tills sync complete.');
		
		return dfd.promise();
	}
	
	/* use till service to post tills */
	TillService.sync(tills).done(function(results){
		
		var result = null;
		var uuid,status,error;
		
		var till = null;
		
		var promises = [];
		
		for(var i=0; i<results.length; i++){
			
			result = results[i];			
			
			uuid = result['uuid'];
			status = result['status'];
			
			till = APP.TILL.search({'uuid':uuid})[0];
			
			till.syncstatus = status;
			
			switch( status ){		
			
				case APP.SYNC_STATUS.QUEUED : 
					
					till.issync = 'N';
					
					break;
				
				case APP.SYNC_STATUS.ERROR : 
					
					error = result['error'];
					
					till.syncerror = error;
					till.issync = 'Y';
					
					break;
				
				case APP.SYNC_STATUS.SYNCHRONIZED : 					
					
					till.issync = 'Y';
					
					break;
					
				default:
					
					console.error('Invalid status ==> ' + status);
					
					break;
			}
			
			if( till.issync == 'Y' ){
				
				var promise = APP.TILL.saveTill( till );	
				promises.push( promise );
			}
			else
			{
				console.log( '#' + uuid + ' queued' );
			}			
			
		}// for
		
		jQuery.when.apply( jQuery, promises ).done(function() {        
	        for (var i = 0, j = arguments.length; i < j; i++) {
	        	if(arguments[i]) console.log(arguments[i]);
	        }
	        
	        dfd.resolve('tills sync complete.');
	        
	    }).fail(function() {        
	        for (var i = 0, j = arguments.length; i < j; i++) {
	        	if(arguments[i]) console.error(arguments[i]);
	        }
	        
	        dfd.reject('Failed to sync tills!');
	    });
		
		
		}).fail(function(error) {
			
			console.error(error);			
			dfd.reject( error );
		});
	
	return dfd.promise();
	
};

APP.synchronizeDocumentNo = function(){
	
	var info = {};
	info['terminal_id'] = this.TERMINAL_KEY;
	info['document_no'] = localStorage.getItem('DOCUMENT_NO') || 0;
	info['cash_up_document_no'] = localStorage.getItem('CASH_UP_DOCUMENT_NO') || 0;
	
	return DocumentNoService.sync(info);
	
};

/*
APP.pushData().done(function(msg){console.log(msg);}).fail(function(msg){console.log(msg);});
/*/
APP.pushData = function(){
	
	APP.OrderSynchronizer.run(); /* force order synchronizer to run */
	
	var dfd = new jQuery.Deferred();
	
	$.when(			
			/*APP.synchronizeOrders(),*/
			APP.synchronizeTills(),
			APP.synchronizeDocumentNo()
			
	).done(function(){
		
		for (var i = 0, j = arguments.length; i < j; i++) {
        	if(arguments[i]) console.log(arguments[i]);
        }
		
		dfd.resolve('Data push completed');
		
	}).fail(function(){
		
		for (var i = 0, j = arguments.length; i < j; i++) {
        	if(arguments[i]) console.error(arguments[i]);
        }
		
		dfd.reject('Data push failed!');
		
	});
	
	return dfd.promise();
	
};

/*======================== Printer Settings ======================*/
APP.PRINTER_SETTINGS = {};
APP.PRINTER_SETTINGS.getSettings = function(){
	
	if(this.settings){
		return this.settings;
	}
	
	var settings = localStorage.getItem('PRINTER_SETTINGS');
	
	if(settings == null){
		return {
			enableTillSlip : true,
			enablePrinter : false,
			printerName : "",
			lineWidth : 54
		};
	}	
	
	settings = JSON.parse( settings ); 
	
	this.settings = settings;
	
	return settings;
};

APP.PRINTER_SETTINGS.saveSettings = function( settings ){
	
	localStorage.setItem('PRINTER_SETTINGS', JSON.stringify(settings));
	this.settings = settings;
};

APP.PRINTER_SETTINGS.testPrinterSettings = function( settings ){
	
	this.settings = settings;
	
	var dfd = new jQuery.Deferred();
	
	var format = [];
	
	if( this.isDrawerEnabled() ){
		
		format.push(['OPEN_DRAWER']);		
	}	
	
	format.push(['FEED']);
	format.push(['FEED']);
	format.push(['CENTER']);
	format.push(['N', '*********************' ]);
	format.push(['N', 'This is a printer test page.' ]);
	format.push(['N', '*********************' ]);
	format.push(['FEED']);
	format.push(['FEED']);
	format.push(['PAPER_CUT']);
	
	
	var printer = PrinterManager.getPrinter();
	var printerName = settings['printerName'];
	
	var printData = printer.format(format);
	
	printer.print(printerName, printData).done(function(){
		
		dfd.resolve();
		
	}).fail(function(){
		
		dfd.reject();
		
	}).always(function(){
		
		APP.PRINTER_SETTINGS.settings = null;
		APP.PRINTER_SETTINGS.getSettings();
		
	});	
	
	
	return dfd.promise();	
};

APP.PRINTER_SETTINGS.testPoleDisplaySettings = function( settings ){
	
	this.settings = settings;
	
	var dfd = new jQuery.Deferred();
	
	var printer = NODEJS_Printer;
	var printerName = settings['poleDisplayName'];
	
	var printJob = PoleDisplay_ESC_COMMANDS.CLEAR;
    printJob = printJob + JSReceiptUtils.format("Welcome to", 20);
    printJob = printJob + JSReceiptUtils.format("Posterita POS", 20);
	
	printer.print(printerName, printJob).done(function(){
		
		dfd.resolve();
		
	}).fail(function(){
		
		dfd.reject();
		
	}).always(function(){
		
		APP.PRINTER_SETTINGS.settings = null;
		APP.PRINTER_SETTINGS.getSettings();
		
	});	
	
	
	return dfd.promise();	
};

APP.PRINTER_SETTINGS.isPrinterEnabled = function(){
	return ( true == this.getSettings().enablePrinter );
};

APP.PRINTER_SETTINGS.isDrawerEnabled = function(){
	return ( true == this.getSettings().enableDrawer );
};

APP.PRINTER_SETTINGS.isKitchenPrinterEnabled = function(){
	return ( true == this.getSettings().enableKitchenPrinter );
};

APP.PRINTER_SETTINGS.isPoleDisplayEnabled = function(){
	return ( true == this.getSettings().enablePoleDisplay );
};

APP.PRINTER_SETTINGS.isTillSlipEnabled = function(){
	return ( true == this.getSettings().enableTillSlip );
};

APP.PRINTER = {};
APP.PRINTER.openDrawer = function(){
	
	if(APP.PRINTER_SETTINGS.isDrawerEnabled())
	{
		PrinterManager.print([['OPEN_DRAWER']]);
	}
};

/*======================== Buffer Settings ======================*/
APP.BUFFER_SETTINGS = {};

