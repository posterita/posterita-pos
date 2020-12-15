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

APP.OrderSynchronizer = {
		
		interval : 1,
		
		limit : 100,
		
		timeout_handle : null,
		
		status : 'IDLE', /* 'IDLE', 'RUNNING'*/
		
		start : function(){			
			
			console.log("###### Starting order synchronizer ######");
			
			this.setScheduler();
			
		},
		
		setScheduler : function(){
			
			var ref = this;
			
			this.status = 'IDLE';
			
			this.timeout_handle = window.setTimeout( function(){ ref.run(); }, ref.interval * 60 * 1000 );
			
		},
		
		stop : function(){
			
			window.clearTimeout(this.timeout_handle);			
		},
		
		run : function(){
			
			if( this.status == 'RUNNING' ){
				return;
			}
			
			window.clearTimeout(this.timeout_handle); /* prevent parallel running */
			
			console.log("###### Running order synchronizer ######");
			/* query orders */
			
			this.status = 'RUNNING';
				    	
	    	var orders = APP.ORDER.cache({'issync':'N'}).limit(this.limit).get();
	    	
	    	console.log('Found ' + orders.length + ' orders.');
	    	
	    	if( orders.length > 0 ){
	    		
	    		/* use order service to post orders */
	    		OrderService.sync( orders ).done(function(results){
	    			
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
	    		        
	    		        console.log('orders sync complete.');
	    		        
	    		    }).fail(function() {        
	    		        for (var i = 0, j = arguments.length; i < j; i++) {
	    		        	if(arguments[i]) console.error(arguments[i]);
	    		        }
	    		        
	    		        console.log('Failed to sync orders!');
	    		    });
	    			
	    			
	    			}).fail(function(error){
	    				
	    				console.error(error);
	    				
	    			}).always(function(){
	    				
	    				APP.OrderSynchronizer.setScheduler();
	    				
	    			});   
	    		
	    	}
	    	else 
	    	{
	    		APP.OrderSynchronizer.setScheduler();
	    	}
	    	
	    
		}
};

