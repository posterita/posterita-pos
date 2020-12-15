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

var ANDROID_PRINTER = {
		
		connected: false,
		
		getPrinterConfiguration: function() {
	        return PrinterManager.getPrinterConfiguration();
	    },
	    
	    format: function(printFormat) {

	        return POSTERITA_Printer.format( printFormat );
	    },
	    
	    print : function( printerName, printData ) {
	    	
	    	var dfd = new jQuery.Deferred();
	    	
	    	//use USBPrinterPlugin
	    	if(typeof USBPrinterPlugin == "undefined"){
	    		
	    		dfd.reject("Printer plugin not found!");
	    	}
	    	else
	    	{
	    		USBPrinterPlugin.print( printData , function(message){
	    			
	    			dfd.resolve( message );
	    			
	    		}, function(err){
	    			
	    			dfd.reject("Printer plugin: " + err);
	    			
	    		});
	    	}
	    	
	    	return dfd.promise();
	    },
	    

	    getPrinters: function() {

	        var dfd = new jQuery.Deferred();

	        //use USBPrinterPlugin
	    	if(typeof USBPrinterPlugin == "undefined"){
	    		
	    		dfd.reject("Printer plugin not found!");
	    	}
	    	else
	    	{
	    		USBPrinterPlugin.printerInfo( function(info){
	    			
	    			var printerInfo = JSON.parse(info);
	    			
	    			if(printerInfo.found == true){
	    				
	    				var printers = [
		    				"USB Printer - " + printerInfo['productid']
		    			];		    			
	    			}
	    			else
	    			{
	    				dfd.reject("No usb printer found!");
	    			}
	    			
	    			dfd.resolve( printers );
	    			
	    		}, function(err){
	    			
	    			dfd.reject("Printer plugin: " + err);
	    			
	    		});
	    	}
	        
	        
	    	return dfd.promise();
	    }
	    
	    
};

//request usb permission
USBPrinterPlugin.testUsb(function(msg){
	alert(msg);
	
}, function(err){
	alert(err);
});
PrinterManager.setPrinter( ANDROID_PRINTER );

