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

/*== Node.js printer implementation ==*/
var fileSys = require('fs');
var operatingSys = require('os');
var doIt = require("child_process").exec;

var NODEJS_Printer = {

    getPrinterConfiguration: function() {
        return PrinterManager.getPrinterConfiguration();
    },

    format: function(printFormat) {

        var configuration = this.getPrinterConfiguration();

        console.info(configuration);

        var LINE_WIDTH = configuration.LINE_WIDTH;
        var LINE_SEPARATOR = JSReceiptUtils.replicate('-', LINE_WIDTH);

        var request = "";
        /* Restore line spacing */
        request += ESC_COMMANDS.DEFAULT_LINE_SPACING;

        for (var i = 0; i < printFormat.length; i++) {
            var line = printFormat[i];

            if (line.length == 1) {
                var command = line[0];

                switch (command) {
                    case 'FEED':
                        request += ESC_COMMANDS.LINE_FEED;
                        break;

                    case 'SEPARATOR':
                        request += LINE_SEPARATOR;
                        request += ESC_COMMANDS.LINE_FEED;
                        break;

                    case 'CENTER':
                        request += ESC_COMMANDS.CENTER_ALIGN;
                        break;

                    case 'LEFT':
                        request += ESC_COMMANDS.LEFT_ALIGN;
                        break;

                    case 'RIGHT':
                        request += ESC_COMMANDS.RIGHT_ALIGN;
                        break;

                    case 'SIGNATURE':

                        var canvas = document.getElementById("signature-canvas");
                        if (canvas) {
                            var imageBase64 = canvas.toDataURL();
                            request = request + "<image>" + imageBase64 + "<image>";
                        } else {
                            request += (ESC_COMMANDS.FONT_NORMAL_BOLD + JSReceiptUtils.format(I18n.t("Signature") + ":________________________________________________", LINE_WIDTH));
                        }

                        request += ESC_COMMANDS.LINE_FEED;
                        break;

                    case 'PAPER_CUT':
                        request += ESC_COMMANDS.PAPER_CUT;
                        request += ESC_COMMANDS.LINE_FEED;
                        break;

                    case 'OPEN_DRAWER':
                        request += ESC_COMMANDS.OPEN_DRAWER;
                        break;

                    case 'NVRAM':
                        request += ESC_COMMANDS.NVRAM;
                        break;

                }



            } else {
                var font = line[0];
                var text = line[1];

                if (text == null) continue;

                if (line.length > 2) {
                    var label = line[2];
                    text = label + text;
                }

                switch (font) {
                    /*normal*/
                    case 'N':
                        request += ESC_COMMANDS.FONT_NORMAL;
                        break;

                        /*bold*/
                    case 'B':
                        request += ESC_COMMANDS.FONT_NORMAL_BOLD;
                        break;

                        /*invert*/
                    case 'I':
                        request += ESC_COMMANDS.FONT_NORMAL;
                        break;

                        /*underline*/
                    case 'U':
                        request += ESC_COMMANDS.FONT_NORMAL;
                        break;

                        /*small*/
                    case 'S':
                        request += ESC_COMMANDS.FONT_SMALL;
                        break;

                        /*header 1*/
                    case 'H1':
                        request += ESC_COMMANDS.FONT_H1;
                        break;

                        /*header 2*/
                    case 'H2':
                        request += ESC_COMMANDS.FONT_H2;
                        break;

                        /*header 3*/
                    case 'H3':
                        request += ESC_COMMANDS.FONT_H3;
                        break;

                        /*header 4*/
                    case 'H4':
                        request += ESC_COMMANDS.FONT_H4;
                        break;


                    case 'BARCODE':

                        var barcodeLengthMap = ['\x04', '\x05', '\x06', '\x07', '\x08', '\x09', '\x0A', '\x0B', '\x0C', '\x0D', '\x0E', '\x0F'];
                        var barcodeLength = barcodeLengthMap[text.length - 4];
                        var barcode = '\x1D' + 'h' + '\x64' + '\x1D' + 'w' + '\x02' + '\x1D' + 'H' + '\x02' + '\x1D' + 'k' + '\x45' + barcodeLength + text;

                        request += ESC_COMMANDS.LINE_FEED;
                        request += barcode;
                        /* override barcode text */
                        text = "";
                        break;

                    case 'CANVAS':
                        var canvas = text;
                        var imageBase64 = canvas.toDataURL();
                        request = request + "<image>" + imageBase64 + "<image>";
                        text = "";
                        break;

                    case 'IMG':
                        var imageBase64 = text;
                        request = request + "<image>" + imageBase64 + "<image>";
                        text = "";
                        break;
                        
                    case 'BASE64':
                        var encoded = text;
                        request = request + Buffer.from(encoded, "base64").toString() + ESC_COMMANDS.LINE_FEED;
                        text = "";
                        break;

                }


                request += text;
                request += ESC_COMMANDS.LINE_FEED;

            }
        }

        return request;
    },

    print : function( printerName, printData ) {
    	
    	// and just in case you forgot it add a final printit/newline
        printData = printData + String.fromCharCode(10);  
    	
        var dfd = new jQuery.Deferred();
        
        var OS = this.getOS();
        
        // finally use OS specific method to copy to printer or print it via cups lp implementation
        // Windows needs try catch , while cups delivers a result anyway
        if (OS == "WIN") {
            try 
            {
            	/*
                fileSys.writeFile('//localhost/' + printerName, printData, function(error){
                	
                	if(error){
                		
                		dfd.reject("Failed to print : " + error);
                		console.error(error);
                		return;
                	}
                	
                	dfd.resolve("data printed");
                	
                });
                */
            	var path = require('path');
            	var x = path.join(__dirname, 'js', 'printing-implementation', 'win-printer.js');
            	
            	console.log(x);
            	
            	var win_printer = require(x);
            	
            	win_printer.printDirect({data:printData // or simple String: "some text"
            		, printer : printerName // printer name, if missing then will print to default printer
            		, type: 'RAW' // type: RAW, TEXT, PDF, JPEG, .. depends on platform
            		, success:function(jobID){
            			console.log("sent to printer with ID: "+jobID);
            			dfd.resolve("data printed");
            		}
            		, error:function(err){
            			console.log(err);
            			dfd.reject("Failed to print : " + err);
            		}
            	});
                
            } 
            catch (e) {
              console.log(e);
              dfd.reject("Failed to send print data : " + e.message);
            }
        }
        
        if (OS == "LINUX") {
        	
        	 var tempdir = operatingSys.tmpdir();
             var filename = tempdir + "/" + printerName.split(' ').join('') + ".prt";
        	
        	// delete the last version of our RAW file
            fileSys.lstat(filename, function(err, stats){
            	
            	if(err) {
            		// why bother deleting if the file does not even exist
            	}
            	        		
        		fileSys.unlink(filename, function(err){
        			
        			// why bother deleting if the file does not even exist
        	        
        			// write our content to the RAW printer file
    	            fileSys.appendFile(filename, printData, 'binary', function(error){
    	            	
    	            	if (error) {
    	            		
    	            		dfd.reject("Failed to print : " + error);
    	            	    console.error(error);
    	            	    return;
    	            	    
    	            	}
    	            	
    	            	printcommand = "lp -d " + printerName + " " + filename;
        	            
        	            doIt(printcommand, {encoding: 'UTF-8'}, function( error, stdout, stderr ){
        	            	
        	            	if (error) {
        	            		
        	            		dfd.reject("Failed to print : " + error);
        	            	    console.error(error);
        	            	    return;
        	            	    
        	            	}
        	            		            		
        	            	//console.log(`stdout: ${stdout}`);
        	            	//console.log(`stderr: ${stderr}`);
        	            	
        	            	if (stdout.indexOf("not found") > -1) {
            	                dfd.reject(error);
            	            } else {
            	                dfd.resolve("data printed");
            	            }
        	            	
        	            });
    	            	
    	            }); 
        			
        		});
            	
            });
        	
        }

        
        
        
        /*

        try {
            stats = fileSys.lstatSync(filename);
            if (stats.isFile()) {
                fileSys.unlinkSync(filename);
            }
        } catch (e) {
            // why bother deleting if the file does not even exist
        }

        // and just in case you forgot it add a final printit/newline
        printData = printData + String.fromCharCode(10);
        // write our content to the RAW printer file
        fileSys.appendFileSync(filename, printData, 'binary');
        
        var OS = this.getOS();

        // finally use OS specific method to copy to printer or print it via cups lp implementation
        // Windows needs try catch , while cups delivers a result anyway
        if (OS == "WIN") {
            try {
                fileSys.writeFileSync('//localhost/' + printerName, fileSys.readFileSync(filename));
                dfd.resolve("data printed");
            } catch (e) {
              dfd.reject("Error copying prt file : " + e.message);
            }
        }

        if (OS == "LINUX") {
            printcommand = "lp -d " + printerName + " " + filename;
            var error = doIt(printcommand, {
                encoding: 'UTF-8'
            });
            if (error.indexOf("not found") > -1) {
                dfd.reject(error);
            } else {
                dfd.resolve("data printed");
            }
        }
        */

        return dfd.promise();

    },


    getPrinters: function() {

        var dfd = new jQuery.Deferred();

        var printers = [];

        var OS = this.getOS();

        // running os specific command to detect printers i.e. net view on Windows lp on linux like
        // using ifs here because if we vcant detect on which system we run its not worth the whole thing so no case/default scheme
        if (OS == "WIN") {
            // old Version using cmd and net view
            //			// this will return all network resources including printers
            //            var listCommand = 'net view \\\\localhost';
            //            // run the command and collect the output
            //			var listResult = doIt( listCommand,{encoding:'utf8'});
            //            // split output into single lines
            //			listResultLines = listResult.split("\n");
            //            // check items i.e. lines for the printer Keyword
            //			for(var d=0;d<listResultLines.length;d++){
            //				if (listResultLines[d].indexOf(OS_PRINTERKEYWORD)>0) {
            //                    listLineParts = listResultLines[d].split(OS_PRINTERKEYWORD);
            //                    //name is the first part so push it to printerlist
            //					exports.ESCPOS_PRINTERLIST.push(listLineParts[0].trim());
            //                }
            //			}

            // new  Version using powershell (always in english ? )
            listCommand = "wmic printer get name";
            // collect result
            doIt(listCommand, {encoding: 'ascii'}, function(err, stdout, stderr){
            	
            	if(err){
            		
            		df.reject('Failed to load printers. Error: ' + error);
            		return;
            		
            	}
            	
            	var listResult = stdout;
            	
            	//split into single lines
                listResultLines = listResult.split("\n");
                for (var d = 1; d < listResultLines.length; d++) {
                    if (listResultLines[d].trim().length > 0)
                        printers.push(listResultLines[d].trim());
                    continue;

                    // look for the keyword ShareName
                    if (listResultLines[d].indexOf("Name ") > -1) {
                        //split by colon
                        listLineParts = listResultLines[d].split(":");
                        if (listLineParts[1].trim().length > 0) {
                            // and push if the right part holds a share/Printer Name
                            printers.push(listResultLines[d].trim());
                        }
                    }               
                    
                }
                
                dfd.resolve(printers);
            	
            });           

        }

        if (OS == "LINUX") {
            // better than win here, list printers only
            var listCommand = "lpstat -v";
            //run the command and collect output
            doIt(listCommand, {encoding: 'utf8'}, function(error, stdout, stderr){
            	
            	if(error){
            		
            		df.reject('Failed to load printers. Error: ' + error);
            		return;
            		
            	}
            	
            	var listResult = stdout;
            	
            	// split output into single lines
                listResultLines = listResult.split("\n");
                for (var d = 0; d < listResultLines.length; d++) {
                    // lpstat delivers "device for PRINTERNAME : ADDITIONAL info"
                    // so first check for colon (:) then split by the word for
                    if (listResultLines[d].indexOf(":") > 0) {
                        listLineParts = listResultLines[d].split(":");
                        detailParts = listLineParts[0].split("for");
                        //name is the second part so push it
                        printers.push(detailParts[1].trim());
                    }
                }
                
                dfd.resolve(printers);
            	
            });            
            
        }

        
        return dfd.promise();
    },
    
    getOS: function(){
    	
    	// first detect OS defaulting it to whatever you like Win in this case
        var osOriginal = operatingSys.platform();
        var OS = "WIN";
        
        switch (osOriginal) {
            case "win32":
                OS = "WIN";
                break;
            case "win64":
                OS = "WIN";
                break;
            case "darwin":
                OS = "OSX";
                break;
            case "linux":
                OS = "LINUX";
                break;
            default:
                OS = "WIN";
        }
        
        return OS;
    	
    }
};

PrinterManager.setPrinter( NODEJS_Printer );
