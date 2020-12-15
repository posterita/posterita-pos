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

var Service = {
		
		getServerEndPointUrl : function(){
			return APP.SERVER_ENDPOINT_URL;
		},
		
		call : function(url, params, errorMessage){
						
			var timeout = setTimeout(function() {
				
				onTimeout();
				
		    }, 10 * 60 * 1000); // 10 mins 
			
			var onTimeout = function(){
								
				ajax.abort();
				
				console.log('Connection timeout');
			};
			
			var dfd = new jQuery.Deferred();
			
			var ajax = jQuery.post( this.getServerEndPointUrl() + '/' + url,
					
				params,
				
	    		function(json, textStatus, jqXHR){	
	    			
					clearTimeout( timeout );
				
	    			if(json == null || jqXHR.status != 200){
	    				dfd.reject(errorMessage); 
	    				return;
	    			}  
	    			
	    			if(json.error){
	    				dfd.reject(json.error);
	    				return;
	    			}
	    			
	    			dfd.resolve(json); 					    		    			
	    			
	    		},
			"json").fail(function( jqXHR, textStatus, errorThrown ){
				
				clearTimeout( timeout );
				
				if( 'abort' == textStatus )
				{
					dfd.reject(errorMessage + " Connection timeout.", true);
				}
				else if( jqXHR.status == 0 && jqXHR.responseText == '' ){
					
					dfd.reject("Failed to connect to server!");
				}
				else
				{
					dfd.reject(errorMessage);
				}				
				
			});
			
			return dfd;
		}
};

var ServerEndPointService = jQuery.extend({	
	
	test : function( endpoint ){
		
		var url = "app/test";
		var errorMessage = "Failed to test server endpoint!";
		
		this.getServerEndPointUrl = function(){
			return endpoint;
		};
		
		return this.call(url, {}, errorMessage);
	},
	
}, Service);

var LoginService = jQuery.extend({	
	
	login : function( email, password ){		
		var url = "app/login";
		var errorMessage = "Failed to sign in!";
		
		var params = {
				'email' : email,
				'password' : password
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);

var CustomerService = jQuery.extend({	
	
	update : function( customer ){		
		var url = "app/update-customer";
		var errorMessage = "Failed to create/update customer!";
		
		var params = {
				'customer' : JSON.stringify(customer),
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);

var ProductService = jQuery.extend({	
	
	update : function( product ){		
		var url = "app/update-product";
		var errorMessage = "Failed to create/update product!";
		
		var params = {
				'product' : JSON.stringify(product),
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);

var OrderService = jQuery.extend({	
	
	sync : function( orders ){		
		var url = "app/sync-order";
		var errorMessage = "Failed to sync orders!";
		
		var params = {
				'orders' : JSON.stringify(orders),
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	},
	
	voidOrder : function ( uuid ){
		var url = "app/void-order";
		var errorMessage = "Failed to void order!";
		
		var params = {
				'uuid' : uuid,
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	}
	
}, Service);

var TillService = jQuery.extend({	
	
	sync : function( tills ){		
		var url = "app/sync-till";
		var errorMessage = "Failed to sync tills!";
		
		var params = {
				'tills' : JSON.stringify(tills),
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);

var DocumentNoService = jQuery.extend({	
	
	sync : function( info ){		
		var url = "app/sync-document-no";
		var errorMessage = "Failed to sync document no!";
		
		var params = {
				'info' : JSON.stringify(info),
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);

var DatabaseService = jQuery.extend({	
	
	requestUpdates : function(){		
		var url = "app/pull-data";
		var errorMessage = "Failed to request updates!";
		
		var last_updated = APP.getLastUpdated() || '2018-01-01 00:00:00';
		
		var params = {
				'account_key' : APP.ACCOUNT_KEY,
				'last_updated' : last_updated
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);
