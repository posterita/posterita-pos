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

var MOCK_PRINTER = {
		
		getPrinterConfiguration: function() {
	        return PrinterManager.getPrinterConfiguration();
	    },
	    
	    format: function(printFormat) {

	        return HTMLPrinter.getHTML( printFormat );
	    },
	    
	    print : function( printerName, printData ) {
	    	
	    	var dfd = new jQuery.Deferred();
	    	
	    	ons.notification.alert({
				  messageHTML: '<div>' + printData + '</div>',
				  title: 'Mock Printer',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
	    	
	    	dfd.resolve( "printed" );
	    	
	    	return dfd.promise();
	    },
	    

	    getPrinters: function() {

	        var dfd = new jQuery.Deferred();

			var printers = [
				"Mock Printer"
			];
			
			dfd.resolve( printers );	        
	        
	    	return dfd.promise();
	    }
	    
	    
};

PrinterManager.setPrinter( MOCK_PRINTER );

