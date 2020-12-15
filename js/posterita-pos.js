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

var isCordovaApp = !!window.cordova;
var isNodeApp = !!window.process;

var TEST_MODE = false; //toggle test mode

var search_product_handle = null;

var ShoppingCart = new Cart();

function closeApp(){
	
	if(isNodeApp){
		var remote = require('electron').remote;
		var window = remote.getCurrentWindow();
		window.close();
   }
   else if(isCordovaApp)
   {
	   ons.notification.confirm({
		  message: 'Do you want to quit?',
		  // or messageHTML: '<div>Message in HTML</div>',
		  title: 'Posterita POS',
		  buttonLabels: ['Yes', 'No'],
		  animation: 'default', // or 'none'
		  primaryButtonIndex: 1,
		  cancelable: false,
		  callback: function(index) {
		    // -1: Cancel
		    // 0-: Button index from the left
		    if(index == 0){
		    	
		    	navigator.app.exitApp();  		    	
		    }
		  }
		});
   }
   else
   {
	   
   }
	
}

function onConfirmQuit(button){
   if(button == "1"){
	   navigator.app.exitApp();      
   }
}

function backButtonHandler(){
	
}


function formatPoleDisplayLine(label, value){
	return label + JSReceiptUtils.format(value, (20 - label.length), true);
}

function initializeBuffer(){
	
	BufferService.init().done(function(x){
		
		console.log(x);
		
	}).fail(function(e){
		
		console.error(e);
		
	});	
}

function initializeShoppingCart(){
	ShoppingCart.init();
}

function initializeDevices(){
	
	
}

function selectSearchProduct(){
	
	var element = document.getElementById('search-product-textfield');
	
	if(element != null){
		element.value="";
		element.select();
	}
	
}

function validateTerminal()
{
	menu.on('postclose', function(event){
		
		var m = event.slidingMenu;
		if(m._currentPageUrl == "page/order-screen.html"){
			selectSearchProduct();
		}
		
	});

	var terminal_key = APP.TERMINAL_KEY;
	
	// validate terminal key
	var terminal = APP.TERMINAL.getById( terminal_key );
	
	if( terminal == null )
	{
		// go to select terminal
		menu.setMainPage('page/select-terminal.html', {closeMenu: true});		
	}
	else
	{
		//update documentNo
		var remote_sequence = terminal['sequence'];
		var local_sequence = localStorage.getItem('DOCUMENT_NO') || '0';
		local_sequence = parseInt(local_sequence);
		
		if( remote_sequence > local_sequence ){
			
			localStorage.setItem('DOCUMENT_NO', remote_sequence);			
		}
		
		//update cash up documentNo
		var remote_cash_up_sequence_no = terminal['cash_up_sequence'] || 0;
		var local_cash_up_sequence_no = localStorage.getItem('CASH_UP_DOCUMENT_NO') || '0';
		local_cash_up_sequence_no = parseInt(local_cash_up_sequence_no);
		
		if( remote_cash_up_sequence_no > local_cash_up_sequence_no ){
			
			localStorage.setItem('CASH_UP_DOCUMENT_NO', remote_cash_up_sequence_no);			
		}
		
		var user_key = APP.USER_KEY;
		
		// validate user key
		var user = APP.USER.getById( user_key );
		
		if( user == null)
		{
			// go to select user
			menu.setMainPage('page/select-user.html', {closeMenu: true});
		}
		else
		{
			initializeShoppingCart();
			initializeBuffer();
			//initializeDevices();
			
			ShoppingCart.clear();
			
			// start order synchronizer
			APP.OrderSynchronizer.start();
			
			// check if till is open or close
			var tills = APP.TILL.search({'closingdate': null, 'terminal_id': {'==' : APP.TERMINAL_KEY}}); /* support multiple terminal  */
			
			if(tills.length == 0)
			{
				// go to open till
				menu.setMainPage('page/open-till.html', {closeMenu: true});
			}
			else
			{
				APP.TILL_KEY = tills[0].till_id;
				
				// go to order screen
				menu.setMainPage('page/order-screen.html', {closeMenu: true});
				
				/*
				//set interval
				window.setInterval(function(){
					
					if(document.activeElement.tagName == 'BODY'){
						
						var element = document.getElementById('search-product-textfield');
						
						if(element != null){
							element.select();
						}
					}					
					
				}, 1000);
				*/
				
			}			
			
		}		
		
	}
	
	// close modal
	modal.hide();
}

function logout()
{
	ons.notification.confirm({
		  message: 'Do you want to log out?',
		  // or messageHTML: '<div>Message in HTML</div>',
		  title: 'Confirmation',
		  buttonLabels: ['Yes', 'No'],
		  animation: 'default', // or 'none'
		  primaryButtonIndex: 1,
		  cancelable: false,
		  callback: function(index) {
		    // -1: Cancel
		    // 0-: Button index from the left
		    if(index == 0){
		    	
		    	//ShoppingCart.clear();
		    	APP.logOut();
		    	
		    	menu.setSwipeable(false);
		    	// go to order screen
		    	menu.setMainPage('page/select-user.html', {closeMenu: true});		    	
		    }
		  }
		});		
	
}

function showAboutDialog()
{
	/*ons.notification.alert({
		  message: 'Posterita POS v' + APP_VERSION,
		  title: 'About',
		  buttonLabel: 'OK',
		  animation: 'default', // or 'none'
		  // modifier: 'optional-modifier'
		  callback: function() {
		    // Alert button is closed!
		  }
		});*/
	
	ons.createDialog('page/about-dialog.html').then(function(dialog) {
	      dialog.show();
	});
	
}

function initDB(){
		
	// initialize database for account
	APP.initializeDB().done( function ( msg ){
		
		console.log( msg );
		
		// synchronize database
		APP.synchronizeDB().done( function ( msg ){
			
			console.log( msg );
			
			// init cache
			APP.initCache().done( function ( msg ){
				
				console.log( msg );
				
				validateTerminal();	
				
				
			}).fail( function ( e ){
				// failed to load cache
				console.error( e );
				
			});
			
			
		}).fail( function ( e ){
			// failed to synchronize db
			console.error( e );
			
		});
		
	}).fail( function ( e ){
		// failed to initialize db
		console.error( e );
		
	});
}

function synchronize(){
	
	modal.show();
	
	APP.pushData().done(function(msg){
		console.log(msg);
		
		ons.notification.alert({
			  message: 'Synchronization completed!',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Information',
			  buttonLabel: 'OK',
			  animation: 'default', // or 'none'
			  // modifier: 'optional-modifier'
			  callback: function() {
			    // Alert button is closed!
			  }
			});
		
	})
	.fail(function(msg){
		
		console.log(msg);
		
		ons.notification.alert({
			  message: 'Fail to synchronize! '+ msg,
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Error',
			  buttonLabel: 'OK',
			  animation: 'default', // or 'none'
			  // modifier: 'optional-modifier'
			  callback: function() {
			    // Alert button is closed!
			  }
			});
	})
	.always(function(){
		modal.hide();
	});
	
}

var module = ons.bootstrap('my-app', ['onsen','ngScrollGlue','angularMoment','720kb.datepicker','angular-useragent-parser','angular-virtual-keyboard']);

module.config(['VKI_CONFIG', function(VKI_CONFIG) {
	
	VKI_CONFIG.relative = false;
	VKI_CONFIG.sizeAdj = false;
	VKI_CONFIG.showInMobile = false;
	VKI_CONFIG.kt = 'US International';
	VKI_CONFIG.deadkeysOn = false;
	VKI_CONFIG.numberPad = true;
	
	VKI_CONFIG.layout['Numeric'] = {
	          'name': 'Numeric', 'keys': [
	          [['1', '1'], ['2', '2'], ['3', '3'], ['Bksp ', 'Bksp']],
	          [['4', '4'], ['5', '5'], ['6', '6'], ['Enter', 'Enter']],
	          [['7', '7'], ['8', '8'], ['9', '9'], ['-', '-']],
	          [['0', '0'],            ['.', '.']]
	        ], 'lang': ['us-US'] };
	
}]);

module.controller('AppController', function($scope, APP, UAParser) {
	
	// navigator.splashscreen.hide();
	if( navigator && navigator.notification ){
		
		window.alert = navigator.notification.alert;
		
	}
	
	if(typeof global != "undefined"){
		
		moment = global.moment;
	}
	
	/* barcode integration */

	/*
	$(document).pos();
	$(document).on('scan.pos.barcode', function(event){
		//access `event.code` - barcode data
		
		$scope.$broadcast("SCAN_BARCODE", event.code);
		
	});
	*/
	/*
	$(document).on('swipe.pos.card', function(event){
		//access following:
		// `event.card_number` - card number only
		// `event.card_holder_first_name` - card holder first name only
		// `event.card_holder_last_name` - card holder last name only
		// `event.card_exp_date_month` - card expiration month - 2 digits
		// `event.card_exp_date_year_2` - card expiration year - 2 digits
		// `event.card_exp_date_year_4` - card expiration year - 4 digits
		// `event.swipe_data` - original swipe data from raw processing or sending to a 3rd party service
	});
	*/
	
	
	/*$scope.$on('userEvent', function(event, user) {		
		$scope.user = user;
	});*/	
	
	$scope.isAdmin = function()
	{
		var user_key = APP.USER_KEY;
		
		// validate user key
		if(APP.USER)
		{
			if( user_key != null)
			{
				var user = APP.USER.getById( user_key );
				
				return user.isadmin == 'Y';
			}
		}		
		return false;		
	};
	
	$scope.requestPermission = function( permission, callback )
	{
		var user = APP.USER.getById( APP.USER_KEY );
		
		if( user['isadmin'] == 'Y' ){
			
			callback();
			
		}
		else
		{
			/* parse permission */
			var permissions = JSON.parse( user.permissions || '{}' );
			
			if( permissions[ permission ] == 'Y' ){
				
				callback();
			}
			else
			{	
				if( $scope.request_permission_dialog != null ){
					
					var dialog = $scope.request_permission_dialog;
					
					dialog.permission = permission;
			    	dialog.callback = callback;
			    	
			    	dialog.show({
	                    animation: 'slide',
	                    callback: function() {	                        
	                    }
	                });
					
				}
				else
				{
					ons.createDialog('page/request-permission-dialog.html', {
				        parentScope: $scope
				    }).then(function(dialog) {
				    	
				    	dialog.permission = permission;
				    	dialog.callback = callback;
				    	
				    	$scope.request_permission_dialog = dialog;
				    	
				    	dialog.show({
		                    animation: 'slide',
		                    callback: function() {		                        
		                    }
		                });
				    });	
				}				
				
			}
		}//else
		
	};
	
	if(isNodeApp){
		
		$("body").keydown(function(e){	         
			//now we caught the key code, yabadabadoo!!
	         var keyCode = e.keyCode || e.which;

	         if(keyCode == 123){	        	 
	        	var remote = require('electron').remote;
	     		var window = remote.getCurrentWindow();
	     		window.webContents.openDevTools();
	         }     
	    });		
	}
	
	/* plugin configurations */
		
	
});

// sync pos
module.controller('SyncController', function($scope) {
	
	// APP.pushData().done(function(msg){console.log(msg);}).fail(function(msg){console.log(msg);});
	// APP.pullData().done(function(msg){console.log(msg);}).fail(function(msg){console.log(msg);});
	
	var setStatus = function( status ){
		
		$scope.$apply(function(){
			$scope.status = status;
		});
		
	};
	
	$scope.status = "Please wait ...";
	// Requesting latest updates ...
	
	$scope.status = "Initializing application ...";
	
	APP.initializeDB().done( function ( msg ){
		
		console.log( msg );
		
		setStatus("Requesting latest updates ...");
		
		// synchronize database
		APP.synchronizeDB().done( function ( msg ){
			
			console.log( msg );
			
			setStatus("Applying updates ...");
			
			// init cache
			APP.initCache().done( function ( msg ){
				
				console.log( msg );
				
				setStatus("Synchronization completed.");
				
				validateTerminal();
				
				
			}).fail( function ( e ){
				// failed to load cache
				console.error( e );
				
				ons.notification.alert({
				  message: 'Fail to start application! ' + e,
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Error',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
					  
					  onConfirmQuit("1");
				  }
				});
				
			});
			
			
		}).fail( function ( e ){
			// failed to synchronize db
			console.error( e );
			
			ons.notification.alert({
			  message: e,
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Error',
			  buttonLabel: 'OK',
			  animation: 'default', // or 'none'
			  // modifier: 'optional-modifier'
			  callback: function() {
			    // Alert button is closed!
				  
				  setStatus("loading data from cache ...");
				  
				  APP.initCache().done( function ( msg ){
						
						console.log( msg );
						
						setStatus("Loading completed.");
						
						validateTerminal();
						
						
					}).fail( function ( e ){
						// failed to load cache
						console.error( e );
						
						ons.notification.alert({
						  message: 'Fail to start application! ' + e,
						  // or messageHTML: '<div>Message in HTML</div>',
						  title: 'Error',
						  buttonLabel: 'OK',
						  animation: 'default', // or 'none'
						  // modifier: 'optional-modifier'
						  callback: function() {
						    // Alert button is closed!
							  
							  onConfirmQuit("1");
						  }
						});
						
					});
			  }
			});
			
		});
		
	}).fail( function ( e ){
		// failed to initialize db
		console.error( e );
		
		ons.notification.alert({
		  message: 'Fail to start application! ' + e,
		  // or messageHTML: '<div>Message in HTML</div>',
		  title: 'Error',
		  buttonLabel: 'OK',
		  animation: 'default', // or 'none'
		  // modifier: 'optional-modifier'
		  callback: function() {
		    // Alert button is closed!
			  
			  onConfirmQuit("1");
		  }
		});
		
	});
	
});

// splashscreen
module.controller('SplashScreenController', function($scope) {
	
	// splash screen
	modal.show();
	
	// disable menu
   	menu.setSwipeable(false);
	
	// load application settings
   	APP.loadSettings();
	
	var server_endpoint_url = APP.SERVER_ENDPOINT_URL;
	// validate server endpoint url
	
	if( server_endpoint_url == null ){
		// go to settings
		menu.setMainPage('page/settings.html', {closeMenu: true});
		modal.hide();
		return;
	}
	
	var account_key = APP.ACCOUNT_KEY;
	// validate account key
	
	if( account_key == null || account_key == 0 ){
		// go to sign in
		menu.setMainPage('page/sign-in.html', {closeMenu: true});
		modal.hide();
		return;
	}
	else
	{
		menu.setMainPage('page/sync.html', {closeMenu: true});
		modal.hide();
		return;
	}
	
});

// server endpoint
module.controller('ServerEndpointController', function($scope) {
	
	$scope.endpoint = APP.SERVER_ENDPOINT_URL;
	
	$scope.continue = function(){
		
		var endpoint = $scope.endpoint;
		
		// TODO validate endpoint
		
		modal.show();
		
		ServerEndPointService.test( endpoint ).done(function(){
			
			APP.setServerEndPointURL( endpoint );
			menu.setMainPage('page/sign-in.html', {closeMenu: true});
			
		}).fail(function(error, timeout){
			
			if(timeout && timeout == true){
				// connection timeout
				
				var activeElement = document.activeElement;
				activeElement.blur();
				
				ons.notification.alert({
		  			  message: error,
		  			  title: 'Error',
		  			  buttonLabel: 'OK',
		  			  animation: 'default', // or 'none'
		  			  // modifier: 'optional-modifier'
		  			  callback: function() {
		  			    // Alert button is closed!
		  			    // $('#email').focus();
		  				  
		  				activeElement.focus();
		  			  }
			  	});
			}
			else
			{
				var activeElement = document.activeElement;
				activeElement.blur();
				
				ons.notification.alert({
	  			  message: "Server endpoint entered is not a valid endpoint!",
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			    // $('#email').focus();
	  				  
	  				activeElement.focus();
	  			  }
		  		});
			}			
			
			
		}).always(function(){
			modal.hide();
		});
		
		
	};
	
});

// sign in
module.controller('SignInController', function($scope) {
		
	$scope.signIn = function(){
		
		var email = $scope.email;
		var password = $scope.password;
		
		modal.show();
		
		LoginService.login( email, password ).done(function(json){
			
			var account_key = json['account_key']; 
			
			APP.setAccountKey( account_key );
			
			menu.setMainPage('page/sync.html', {closeMenu: true});
			// menu.setMainPage('page/select-terminal.html', {closeMenu: true});
			
			modal.hide();
			
			// initDB();
			
		}).fail(function(error){
			
			modal.hide();
			
			var activeElement = document.activeElement;
			activeElement.blur();
			
			ons.notification.alert({
	  			  message: error,
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			    activeElement.focus();
	  			  }
	  			});			
			
		}).always(function(){
			
		});
	};
});

// terminal
module.controller('TerminalController', function($scope) {
	
	var storeList = APP.STORE.getAll();
	var terminalList = APP.TERMINAL.getAll();
	
	$scope.store_id = 0;
	$scope.terminal_id = 0;	
	
	$scope.storeList = storeList;
	$scope.terminalList = [];	
	
	// called when user selects a store
	$scope.renderTerminalSelect = function(){
		
		var store_id = $scope.store_id;
		
		// reset terminal list
		$scope.terminal_id = 0;
		
		var query = {'store_id' : {'==' : store_id}};
		
		$scope.terminalList = APP.TERMINAL.search( query );
	};
	
	
	if( APP.TERMINAL_KEY > 0 ){
		
		var terminal = APP.TERMINAL.getById( APP.TERMINAL_KEY );
		
		if( terminal != null ){
			
			$scope.store_id = terminal['store_id'];;
			$scope.terminal_id = terminal['terminal_id'];
			
			var query = {'store_id' : {'==' : $scope.store_id}};
			
			$scope.terminalList = APP.TERMINAL.search( query );
			
		}
	}
	
	// save terminal
	$scope.setTerminal = function(){
		
		var terminal_id = $scope.terminal_id;
		
		APP.setTerminalKey( terminal_id );
		
		// go to select user
		menu.setMainPage('page/select-user.html', {closeMenu: true});
		
		modal.hide();
	};
	
	// form validation
	$scope.validateForm = function(){
		return ( $scope.store_id > 0 &&  $scope.terminal_id > 0);
	};
	
	$scope.signOut = function(){
		
		ons.notification.confirm({
			  message: 'Do you want to sign out?',
			  title: 'Sign Out Confirmation',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){
			    	
			    	APP.signOut();
			    	
			    	menu.setMainPage('page/sign-in.html', {closeMenu: true});
			    	
			    }
			  }
			});	
	};
	
	$scope.close = function(){
		closeApp();
	};
	
});

// user
module.controller('UserController', function($scope) {
	
	var ctrl = this;
	
	var terminal = APP.TERMINAL.getById(APP.TERMINAL_KEY);
	var store = APP.STORE.getById(terminal.store_id);
	
	ctrl.store = store;
	ctrl.terminal = terminal;
	
	ctrl.changeTerminal = function(){
		menu.setMainPage('page/select-terminal.html', {closeMenu: true});
	};
	
	ctrl.logIn = function(){
		
		var user_id = ctrl.user_id;
		var pin = ctrl.pin;
		
		var user = APP.USER.getById( user_id );
		
		if(user == null){
			
			var activeElement = document.activeElement;
			activeElement.blur();
			
			ons.notification.alert({
	  			  message: 'User not found!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			    $('#user_id').focus();
	  			  }
	  			});
			
			return;
		}
		else
		{
			if( user['pin'] != pin ){
				
				var activeElement = document.activeElement;
				activeElement.blur();
				
				ons.notification.alert({
		  			  message: 'Invalid PIN!',
		  			  // or messageHTML: '<div>Message in HTML</div>',
		  			  title: 'Error',
		  			  buttonLabel: 'OK',
		  			  animation: 'default', // or 'none'
		  			  // modifier: 'optional-modifier'
		  			  callback: function() {
		  			    // Alert button is closed!
		  				activeElement.focus();
		  			  }
		  			});
				
				return;
				
			}
			else
			{
				APP.setUserKey( user_id );
				
				initializeShoppingCart();
				initializeBuffer();
				
				// check if till is open or close
				var tills = APP.TILL.search({'closingdate': null, 'terminal_id': {'==' : APP.TERMINAL_KEY}}); /* support multiple terminal  */
				
				if(tills.length == 0)
				{
					// go to open till
					menu.setMainPage('page/open-till.html', {closeMenu: true});
				}
				else
				{
					APP.TILL_KEY = tills[0].till_id;
					
					// go to order screen
					menu.setMainPage('page/order-screen.html', {closeMenu: true});
				}
				
				
				modal.hide();
			}
		}
			
		
	};
	
	var userList = APP.USER.getAll();
	ctrl.userList = userList;
		
	/*var user = APP.USER.getById(APP.USER_KEY);
	$scope.$broadcast('userEvent', user);*/
	
	
	ctrl.press = function(key){
	  	  
  	  var string = ctrl.pin || "";
  	  
  	  switch(key){
  	  
  	  case 'backspace' : 
  		  
  		  string = string.slice(0,string.length-1);		    		  
  		  break;
  		  
  	  case '+/-' : 
  		  
  		  if(string.indexOf('-') == 0)
  		  {
  			  string = string.slice(1);	
  		  }
  		  else
  		  {
  			  string = "-" + string;
  		  }
  		  
  		  break;
  		  
  	  case '.' : 
  		  
  		  if(string.indexOf('.') == -1){
  			  
  			  if(string.length == 0){
  				  string = string + "0";
  			  }
  			  
  			  string = string + '.';
  		  }
  		  break;
  		  
  	  default:
  		  string = string + key;		    	  	
  	  }
  	    	  
  	  ctrl.pin = string;
  	  
    };
	
});

module.service('ShoppingCart', function() {
	
	return ShoppingCart;
	
});

module.service('Payments', function() {
	
	var payments = [];
	
	return payments;
});

module.service('OrderScreen', function($timeout) {
	
	var screen = this;
	
	screen.selectSearch = function(){
		$timeout(function(){
			selectSearchProduct();
		});		
	};
	
	screen.blurSearch = function(){
		$timeout(function(){
			document.getElementById('search-product-textfield').blur();
		});		
	};
	
	screen.reset = function(){
		
		var screen = this;
		
		screen.shouldShowProductSelector = true;
		screen.shouldShowLineDetails = false;
		screen.shouldShowSearchCustomer = false;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;	
		screen.shouldShowCustomerForm = false;
		screen.shouldShowIframe = false;
		screen.shouldShowSearchProduct = false;
		
		screen.selectSearch();
	};
		
	screen.viewLineDetails = function( lineId ){
		
		var screen = this;
		
		screen.shouldShowProductSelector = false;
		screen.shouldShowLineDetails = true;
		screen.shouldShowSearchCustomer = false;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;
		screen.shouldShowCustomerForm = false;
		screen.shouldShowIframe = false;
		screen.shouldShowSearchProduct = false;
		
		screen.lineId = lineId;
		
	};	
	
	/* customer related views */
	screen.searchCustomer = function(){
		
		var screen = this;
		
		screen.shouldShowProductSelector = false;
		screen.shouldShowLineDetails = false;
		screen.shouldShowSearchCustomer = true;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;
		screen.shouldShowCustomerForm = false;
		screen.shouldShowIframe = false;
		screen.shouldShowSearchProduct = false;
		
	};
	
	screen.createCustomer = function(){
		
		var screen = this;
		
		screen.shouldShowProductSelector = false;
		screen.shouldShowLineDetails = false;
		screen.shouldShowSearchCustomer = false;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;		
		screen.shouldShowCustomerForm = true;
		screen.shouldShowIframe = false;
		screen.shouldShowSearchProduct = false;
		
	};
	
	screen.viewCustomer = function(){
		
		/*
		 * var screen = this;
		 * 
		 * screen.shouldShowProductSelector = false;
		 * screen.shouldShowLineDetails = false; screen.shouldShowSearchCustomer =
		 * false; screen.shouldShowCustomerDetails = true;
		 * screen.shouldShowCreateCustomer = false;
		 * screen.shouldShowOrderActions = false; screen.shouldShowCustomerForm =
		 * false;
		 */
		
	};
	
	screen.showIframe = function(){
		
		var screen = this;
		
		screen.shouldShowProductSelector = false;
		screen.shouldShowLineDetails = false;
		screen.shouldShowSearchCustomer = false;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;
		screen.shouldShowCustomerForm = false;
		screen.shouldShowSearchProduct = false;
		
		screen.shouldShowIframe = true;	
		
		document.getElementById("iframe-form").submit();
	};
	
	/* product related views */
	screen.showSearchProduct = function(){
		
		var screen = this;
		
		screen.shouldShowProductSelector = false;
		screen.shouldShowLineDetails = false;
		screen.shouldShowSearchCustomer = false;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;
		screen.shouldShowCustomerForm = false;
		screen.shouldShowIframe = false;
		screen.shouldShowSearchProduct = true;		
	};
	
	screen.reset();
	
});

// sales
module.controller('OrderScreenController', function($scope, $timeout, $window, $http, $q, $timeout, ShoppingCart, OrderScreen, Payments) {
	
	var terminal = APP.TERMINAL.getById(APP.TERMINAL_KEY);
	var store = APP.STORE.getById(terminal.store_id);
	
	$scope.terminalInfo = store.name + ", " + terminal.name;	
	
	jQuery('#search-product-textfield').on('focus', function(){
		
		console.log('Got focus');
		window.clearInterval(search_product_handle);
		
	}).on('blur', function(){
		
		console.log('Lost focus');
		search_product_handle = window.setInterval(function(){
			
			if(
					menu._currentPageUrl == "page/order-screen.html" &&
					document.activeElement.tagName != 'INPUT' &&
					jQuery("div.dialog-mask:visible,div.alert-dialog-mask:visible,div.popover-mask:visible").length == 0					
					
			){
				console.log('setting focus ..');
				jQuery('#search-product-textfield').select();
			}
			
		}, 1000);
		
	});
	
	// enable menu
   	menu.setSwipeable(false);
   	
   	// last sales info
   	OrderScreen.reset();
   	OrderScreen.lastSale = null;
   	
   	$scope.$on("PRODUCT_UPDATED", function(event, product){
   		
   		console.log('Product updated : ' + product);
   		
   		var isvariableitem = product['isvariableitem'];
   		
   		if( isvariableitem == 'Y'){
			
			$scope.variable_item_dialog.show();
			
			$scope.variable_item_dialog.product = product;
			
			return;
		}
   		else{
   			
   			$scope.addLine(product['product_id'], 1);
   		}
   		
   	});
	
	//var productList = APP.PRODUCT.cache({isactive:'Y'}).order("name asec").get();
	var categoryList = APP.PRODUCT_CATEGORY.cache({display:'Y'}).order("position asec").get();
	//var modifierList = APP.MODIFIER.getAll();
	
	//var favouriteList = APP.PRODUCT.cache({isfavourite:'Y'}).order("name").get();
	
	$scope.productList = []; //productList;
	$scope.categoryList = categoryList;
	//$scope.modifierList = modifierList;
	
	$scope.searchTerm = null;
	
	$scope.searchProduct = function(){
		
		OrderScreen.blurSearch();
		
		var query = {};
		
		var criteria = $scope.searchTerm || '';
		$scope.searchTerm = ""; /* reset search term */
		
		var limit = 60;
		
		criteria = criteria.trim();
		
		if(criteria.length == 0){
			
			$scope.productList = APP.PRODUCT.cache({
				isactive:'Y'
			}).order("name asec").limit(limit).get();
			
			OrderScreen.selectSearch();
			
		}
		else
		{			
			
			var isBarcode = ( criteria.match(new RegExp('^\\d{4,}$')) != null );
			
			if(isBarcode == true){
				
				var results = APP.PRODUCT.search({ 'upc' : criteria, 'isactive' : 'Y' });
				
				if( results.length > 0 ){
					var product = results[0];
					var product_id = product['product_id'];
					
					$timeout(function(){
						
						$scope.addLine( product_id , 1);				
						
					});
				}
				else
				{
					var barcode = criteria;
					$scope.productList = [];
					
					ons.notification.confirm({
					    //message: 'Would you like to create missing item?',
					    messageHTML: '<div><br>Would you like to create missing item?<br><br></div>',
					    title: 'Barcode: ' + barcode + ' not found!',
					    buttonLabels: ['Yes', 'No'],
					    animation: 'default', // or 'none'
					    primaryButtonIndex: 1,
					    cancelable: false,
					    callback: function(index) {
					        // -1: Cancel
					        // 0-: Button index from the left
					        if (index == 0) {
					            $scope.barcode = barcode;

					            ons.createDialog('page/create-item-dialog.html', {
					                parentScope: $scope
					            }).then(function(dialog) {
					                dialog.show({

					                    animation: 'slide',
					                    callback: function() {
					                        var input = document.getElementById('create_item_dialog_name');
					                        input.focus();
					                    }

					                });
					            });
					        }
					        else
					        {
					        	OrderScreen.selectSearch();
					        }
					    }
					});
				}
				
			}
			else
			{
				results = APP.PRODUCT.cache({
					'name':  { 'leftnocase' : criteria }, 
					'isactive' : 'Y'
				}).order("name asec").limit(limit).get();
				
				$scope.productList = results;
				
				if(results.length == 0){
					
					OrderScreen.blurSearch();
					
					ons.notification.alert({
						
		  				title : 'Information',
		  				
		  			    'message': "No item found for '" + criteria + "'",
		  			    
		  			    callback: function() {
		  			    	// Do something here.
		  			    	OrderScreen.selectSearch();
		  			    }
		  			});
					
				}
				else
				{
					OrderScreen.selectSearch();
				}
			}
			
		}		
		
	};
	
	$scope.currentcategory = {
		productcategory_id : -1
	};
	
	$scope.setCategory = function( category ){
		$scope.currentcategory = category;	
		
		$scope.productList = APP.PRODUCT.cache({
			isfavourite:'Y',
			isactive:'Y', 
			productcategory_id : category.productcategory_id
		}).order("name asec").limit(60).get();
		
		//| filter:{productcategory_id : currentcategory.productcategory_id, isfavourite:'Y'} : true | limitTo:60
		
		// clear last sales info from cart footer
		OrderScreen.lastSale = null;
		
		//set scroll height
		$("#productSelectorContainer").scrollTop(0);
		
		OrderScreen.selectSearch();
	};
	
	$scope.addLine = function( product_id, qty){
		
		// clear last sales info from cart footer
		OrderScreen.lastSale = null;
		
		/* START CAYAN GIFT CARD */
		var product = APP.PRODUCT.getById( product_id );
		var productcategory_id = product['productcategory_id'];
		
		var isGiftCard = ( APP.GIFT_PRODUCT_CATEGORY_ID == productcategory_id );
		
		if( isGiftCard == true ){
			
			var product_name = product['name'];
			
			if( 'Balance Inquiry' == product_name ){
				
				$scope.gift_card_balance_inquiry_dialog.show();
				
			}
			else if ( 'Activate' == product_name ){
				
				$scope.gift_card_activate_dialog.show();
				$scope.gift_card_activate_dialog.product = product;
				
			}
			else if ( 'Add Value' == product_name ){
				
				$scope.gift_card_add_value_dialog.show();
				$scope.gift_card_add_value_dialog.product = product;
				
			}
			
			return;
			
		}
		
		/* END CAYAN GIFT CARD */
		
		/*Open Item*/
		
		if( APP.OPEN_ITEM_PRODUCT_ID == product_id ){
			
			/*var tax_id = APP.PRODUCT.getById( APP.OPEN_ITEM_PRODUCT_ID ).tax_id;
			var tax = APP.TAX.getById( tax_id );
			
			$scope.tax_name = tax.name;
			$scope.tax_rate = tax.rate;*/
						
			//show popup	
			$scope.open_item_dialog.show();		
			
			return;			
		}
		
		//check price
		var sellingprice = product["sellingprice"];
		var isvariableitem = product["isvariableitem"];
		
		if( sellingprice == 0 ){
			
			ons.notification.confirm({
				  message: 'Do you want to add a price?',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Confirmation',
				  buttonLabels: ['Yes', 'No'],
				  animation: 'default', // or 'none'
				  primaryButtonIndex: 1,
				  cancelable: false,
				  callback: function(index) {
				    // -1: Cancel
				    // 0-: Button index from the left
				    if(index == 0){
				    					    	
				    	$scope.selling_price_dialog.show();
				    	$scope.selling_price_dialog.product = product;
				    }
				    else
				    {
				    	$timeout(function(){
				    		var line = ShoppingCart.addLine( product_id, 1 );
				    	});
				    }
				  }
				});
			
			return;
		}		
		
		//qty for variable item
		
		if( isvariableitem == 'Y'){
			
			$scope.variable_item_dialog.show();
			
			$scope.variable_item_dialog.product = product;
			
			return;
		}
				
		var line = ShoppingCart.addLine(product_id, qty);
		$scope.currentLineIndex = line.index;	
		
	};
	
	
	$scope.addModifier = function( modifier_id ){	
		
		var index = $scope.currentLineIndex;
		
		var modifier = APP.MODIFIER.getById( modifier_id );
		
		if( index == null ) {
			return;
		}
		
		ShoppingCart.addModifier(index, modifier);
		
	};
	
	
	$scope.clearCart = function(){	
		
		if( ShoppingCart.getLines().length == 0 ) return;
		
		ons.notification.confirm({
		  message: 'Do you want to clear order?',
		  // or messageHTML: '<div>Message in HTML</div>',
		  title: 'Confirmation',
		  buttonLabels: ['Yes', 'No'],
		  animation: 'default', // or 'none'
		  primaryButtonIndex: 1,
		  cancelable: false,
		  callback: function(index) {
		    // -1: Cancel
		    // 0-: Button index from the left
		    if(index == 0){
		    	
		    	// validate lines
		    	var lines = ShoppingCart.getLines();
				
				if( lines.length == 0 ) return;
				
				var line = null;
				
				for(var i=0; i<lines.length; i++){
					
					line = lines[i];
					
					if( line.hasOwnProperty('voidable') && line.voidable == false ){
						
						ons.notification.alert({
							
			  				title : 'Error',
			  				
			  			    'message': 'Cannot clear cart. Line - ' + line.product['name'] + ' not voidable.',
			  			    
			  			    callback: function() {
			  			    	// Do something here.
			  			    }
			  			});
						
						return;				
					}
				}
				
				// reset cart
		    	$scope.$apply(function(){
		    		
		    		$scope.reset();
		    		
		    	});
		    	
		    }
		    else
		    {
		    	OrderScreen.selectSearch();
		    }
		  }
		});		
		
	};//clearCart
	
	$scope.screen = OrderScreen;	
	
	
	$scope.currentLineIndex = null;
	
	/* use to highlight active line */
	$scope.isLineSelected = function( index ){
		
		var currentLineIndex = ShoppingCart.index - 1;
		
		if( currentLineIndex != null && currentLineIndex == index){
			return "selected";
		}
		
		return "";
	};
	
	/* use to highlight active line */
	$scope.isCategorySelected = function( productcategory_id ){
		
		if( $scope.currentcategory != null && $scope.currentcategory.productcategory_id == productcategory_id){
			return "selected";
		}
		
		return "";
	};
	
	$scope.viewLine = function(index){
		
		var line = ShoppingCart.getLine(index);
		
		var currentLine = angular.copy(line);
		currentLine.selectedModifiers = [];
		
		var modifiers = line.getModifiers();
		for(var i=0; i<modifiers.length; i++){
			currentLine.selectedModifiers.push( modifiers[i].product_id );
		}
		
		currentLine.isModifierPresent = function( modifier_id ){
			
			var index = this.selectedModifiers.indexOf( modifier_id );
			
			return (index >= 0);
		};
		
		$scope.currentLine = currentLine;
		
		$scope.currentLine.selection = "general";
		// hack for switch
		$scope.enableTax = currentLine.enableTax;
		
		$scope.currentLineIndex = index;
		
		// show page
		$scope.screen.viewLineDetails( index );
		$scope.screen.currentLine = currentLine;
	};
	
	$scope.removeLine = function(index){
		
		var line = ShoppingCart.getLine(index);
		
		ShoppingCart.removeLine(index);
		
		// check view panel
		if(index == $scope.currentLineIndex){
			
			OrderScreen.shouldShowProductSelector = true;
			OrderScreen.shouldShowLineDetails = false;
			$scope.enableTax = true;
			
		}
	};
	
	
	$scope.fastCheckout = function(){	
		
		modal.show();
		
		var payments = [{
			type : 'CASH',
			amount : ShoppingCart.grandtotal
		}];
		
				
		APP.checkout( OrderScreen.customer, ShoppingCart, payments, OrderScreen.order_id, OrderScreen.uuid ).done(function( order ){
			
			var lastSale = {
					type : 'CASH',
					amount : ShoppingCart.grandtotal,
					change : ( ( ShoppingCart.grandtotal < 0 ) ? ( ShoppingCart.grandtotal * -1 ) : 0 )
			};
			
			
			$timeout(function(){
				OrderScreen.lastSale = lastSale;
				$scope.reset();					
			});
			
			
			
		}).fail(function(msg){
			
		}).always(function(msg){
			
			modal.hide();		
			
		});		
		
	};
	
	$scope.checkout = function(payments){
		
		modal.show();
						
		APP.checkout( OrderScreen.customer, ShoppingCart, payments, OrderScreen.order_id, OrderScreen.uuid ).done(function( order ){
			
			var lastSale = {
					type : order.paymenttype,
					amount : order.grandtotal,
					change : order.change
			};			
			
			$timeout(function(){
				OrderScreen.lastSale = lastSale;
				$scope.reset();
			});	
			
			/* START - CAYAN GIFT CARD */
			//$scope.processGiftCard( order );
			/* END - CAYAN GIFT CARD */
			
			/*
			setTimeout(function(){
				CayanCED.startOrder( APP.UTILS.ORDER.getDocumentNo() );
				modal.hide();	
			}, 5000);
			*/
			
		}).fail(function(msg){
			
			console.error(msg);	
			
		}).always(function(msg){
			
			modal.hide();	
			
		});	
		
	};
	
	/* START - CAYAN GIFT CARD */
	
	/* END - CAYAN GIFT CARD */
	
	$scope.showCheckoutDialog = function(){
		
		var grandtotal = ShoppingCart.grandtotal;
		
		if( grandtotal <= 0 ){
			$scope.fastCheckout();
			return;
		}
		
		POLE_DISPLAY.display(formatPoleDisplayLine("TOTAL", new Number(grandtotal).toFixed(2)), "");
		
		$scope.checkout_dialog.show({animation:'slide'});
	};
	
	$scope.closeCheckoutDialog = function(){
		$scope.checkout_dialog.hide();
		OrderScreen.selectSearch();
	};
	
	$scope.showCashDialog = function(){
		
		$scope.checkout_dialog.hide({animation:'slide'});
		
		/* Check for refund */
		if( ShoppingCart.grandtotal < 0 ){
			
			$scope.fastCheckout();
			
			return;
		}
		
		$scope.cash_dialog_amount=null;
		$scope.cash_dialog_error=false;
		$scope.cash_dialog_error_message="";
		
		$scope.cash_dialog.show({
			animation:'slide', 
			callback : function(){
				var input = document.getElementById('cash_dialog_amount');
				input.value = null;
				input.focus();				
			} 
		});
	};	
	
	$scope.showCardDialog = function(){
		
		$scope.checkout_dialog.hide({animation:'slide'});
		
		var payments = [{
			type : 'CARD',
			amount : ShoppingCart.grandtotal
		}];
		
		ons.notification.confirm({
			  messageHTML: '<div>Has the payment gone through?</div>',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Card Payment Confimation',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){
			    	
			    	$scope.checkout( payments );	    			    	
			    }
			  }
			});			
		
	};
	
	$scope.showSplitDialog = function(){
		
		$scope.checkout_dialog.hide({animation:'slide'});		
		
		$scope.split_dialog.show({
			animation:'slide', 
			callback : function(){
				/*
				var input = document.getElementById('cash_dialog_amount');
				input.value = null;
				input.focus();
				*/				
			} 
		});
	};
	
	$scope.closeSplitDialog = function(){
		$scope.split_dialog.hide();
		OrderScreen.selectSearch();
	};
	
	
	
	
	
	$scope.reset = function(){
		
		
		ShoppingCart.clear();	
		OrderScreen.reset();
		
		OrderScreen.order_id = null;
		OrderScreen.uuid = null;
		OrderScreen.customer = null;
		OrderScreen.ref_uuid = null;
		OrderScreen.ref_order_id = null;
		
		$scope.currentLineIndex = null;
		
		//Display change info if any
		if( OrderScreen.lastSale != null ){
			
			var lastSale = OrderScreen.lastSale;
			
			var changeText = null;
			
			if(lastSale.type == 'CASH' || lastSale.type == 'MIXED'){
				
				var change = lastSale["change"];
				change = new Number(change).toFixed(2);
				
				changeText = formatPoleDisplayLine("CHANGE", "" + change);							
			}
			
			var amount = lastSale["amount"];
			amount = new Number(amount).toFixed(2);
			
			var paidText = formatPoleDisplayLine("PAID", "" + amount);
			POLE_DISPLAY.display( paidText , changeText );
			
		}
		
	};	
	
	
	$scope.searchCustomer = function(){
		$scope.shouldShowProductSelector = false;
		$scope.shouldShowSearchCustomer = true;
	};
		
		
	$scope.cart = ShoppingCart;
	
	/*
	 * $scope.cart.onUpdate(function(){ });
	 */
	
	// order screen more popover
	$scope.showMorePopUp = function (){
		
		var targetElement = document.getElementById('order-screen-more-button');
		$scope.more_popover.show(targetElement);
		
	};
	
	$scope.showAddNoteDialog = function ( shouldHoldOrder ){
		
		$scope.shouldHoldOrder =  shouldHoldOrder;
		
		var textarea = document.getElementById('add-note-textarea');
		textarea.value = $scope.cart.note;
		
		$scope.add_note_dialog.show();
		
	};
	
	$scope.updateNote = function ( note ) {
		$scope.cart.note = note;		
	};
	
	
	$scope.holdOrder = function(){
		
		console.log('holdOrder');	
		
		modal.show();
		
		APP.holdOrder(OrderScreen.customer, ShoppingCart, OrderScreen.order_id, OrderScreen.uuid ).done(function(msg){
			
			$scope.$apply(function(){
				$scope.reset();
			});
			
		}).fail(function(msg){
			
		}).always(function(msg){
			
			modal.hide();		
			
		});		
	};
	
	$scope.showOrderHistory = function(){
		console.log('showOrderHistory');
	};
	
	$scope.showSearchProduct = function(){
		
		OrderScreen.showSearchProduct();		
	};
	
	$scope.reprintLastOrder = function(){
		
		$scope.requestPermission( 'reprint', function(){
			
			_reprintLastOrder();
			
		} );
		
	};
	
	var _reprintLastOrder = function(){
		
		var lastDocumentNo = APP.UTILS.ORDER.getCurrentDocumentNo();
		
		var result = APP.ORDER.search({documentno : lastDocumentNo});
		
		var lastOrder = null;
		
		if(result && result.length > 0){
			
			lastOrder = result[0];
			
			if(APP.PRINTER_SETTINGS.isPrinterEnabled()){
				// print receipt
				
				APP.printOrder( lastOrder, true ).done(function(msg){
					
					selectSearchProduct();
					
				}).fail(function(error){			
					ons.notification.alert({
						
		  				title : 'Failed to print',
		  				
		  			    'message': "" + error,
		  			    
		  			    callback: function() {
		  			    	// Do something here.
		  			    	selectSearchProduct();
		  			    }
		  			});
				});
			}
			
		}
		else
		{
			ons.notification.alert({
				
  				title : 'Reprint Last Order',
  				
  			    'message': "No order found!",
  			    
  			    callback: function() {
  			    	// Do something here.
  			    	selectSearchProduct();
  			    }
  			});
		}
		
		selectSearchProduct();
		
	};
	
	//printer settings
	var settings = APP.PRINTER_SETTINGS.getSettings();	
	var enableTillSlip = true; //default to true
	
	if(settings.enableTillSlip && settings.enableTillSlip == false){
		enableTillSlip = false;
	}
	
	$scope.enableTillSlip = enableTillSlip;
	
	$scope.toggleTillSlip = function(enable){
		
		var settings = APP.PRINTER_SETTINGS.getSettings();
		
		//check settings
		if(
				settings.printerName == null ||
				settings.printerName == "" || 
				settings.lineWidth == null ||
				settings.lineWidth == ""
		){
			
			ons.notification.alert({
	  			  message: 'Printer not configured!',
	  			  title: 'Error',
	  			  callback: function() {
	  			    // Alert button is closed!
	  				$scope.enableTillSlip = false;
	  			  }
	  			});
			
			return false;
		}
		
		settings.enableTillSlip = enable;		
		
		APP.PRINTER_SETTINGS.saveSettings(settings);
	};
		
	ons.ready(function() {
		
		ons.createDialog('page/open-item-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.open_item_dialog = dialog;	
	    });
		
		ons.createDialog('page/checkout-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.checkout_dialog = dialog;
	    });
		
		ons.createDialog('page/cash-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.cash_dialog = dialog;
	    });	
		
		ons.createDialog('page/split-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.split_dialog = dialog;
	    });
		
		
		
	    ons.createPopover('page/order-screen-popover.html', {parentScope: $scope}).then(function(popover) {
	      $scope.more_popover = popover;	      
	      
	      $scope.cancelMore = function(){
	    	  $scope.more_popover.hide();
	    	  
	    	  selectSearchProduct();
	      };
	    });
	    
	    
	    ons.createDialog('page/add-note-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.add_note_dialog = dialog;
		      
		      $scope.saveNote = function(){
		    	  var note = document.getElementById('add-note-textarea').value;
		    	  
		    	  $scope.updateNote( note );
		    	  
		    	  $scope.add_note_dialog.hide();
		    	  
		    	  selectSearchProduct();
		      };
		      
		      $scope.saveNoteAndHoldOrder = function(){
		    	  var note = document.getElementById('add-note-textarea').value;
		    	  
		    	  $scope.saveNote( note );
		    	  
		    	  $scope.holdOrder();
		    	  
		    	  $scope.add_note_dialog.hide();
		    	  
		    	  selectSearchProduct();
		      };
		      
		      $scope.cancelNote = function(){	
		    	  $scope.note = null;
		    	  $scope.add_note_dialog.hide();
		    	  
		    	  selectSearchProduct();
		      };
		});
	    
	    
	    /* START - CAYAN GIFT CARD */
	    
	    
	    
	    
	    ons.createDialog('page/gift-card/balance-dialog.html', {parentScope: $scope}).then(function(dialog) {
	    	
		      $scope.gift_card_balance_dialog = dialog;
	    });
	    
	    ons.createDialog('page/selling-price-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.selling_price_dialog = dialog;
	    });
	    
	    ons.createDialog('page/variable-item-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.variable_item_dialog = dialog;
	    });
	    
	    /* END - CAYAN GIFT CARD */
	    
	});
	
	
	// event - from CreateCustomerController
	$scope.$on("CUSTOMER_UPDATED", function(event, customer){
		
		$scope.$broadcast("UPDATE_CUSTOMER_LIST", {});
		
	});	
	
	
	$scope.$on("SCAN_BARCODE", function(event, barcode){
		
		var results = APP.PRODUCT.search({ 'upc' : barcode, 'isactive' : 'Y' });
		
		if( results.length > 0 ){
			var product = results[0];
			var product_id = product['product_id'];
			
			$scope.$apply(function(){
				
				$scope.addLine( product_id , 1);
				
			});			
			
		}
		else
		{
			
			ons.notification.confirm({
				  //message: 'Would you like to create missing item?',
				  messageHTML: '<div><br>Would you like to create missing item?<br><br></div>',
				  title: 'Barcode: ' + barcode + ' not found!',
				  buttonLabels: ['Yes', 'No'],
				  animation: 'default', // or 'none'
				  primaryButtonIndex: 1,
				  cancelable: false,
				  callback: function(index) {
				    // -1: Cancel
				    // 0-: Button index from the left
				    if(index == 0){
				    	$scope.barcode = barcode;
						
						ons.createDialog('page/create-item-dialog.html', {parentScope: $scope}).then(function(dialog) {
						      dialog.show({
						    	  
						    	  animation:'slide', 
									callback : function(){
										var input = document.getElementById('create_item_dialog_name');
										input.focus();
									} 
						    	  
						      });
						});			    			    	
				    }
				  }
				});	
			
			
			
			/*
			ons.notification.alert({
				  message: 'Barcode: ' + barcode + ' not found!',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Information',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
				*/
				
				
			
		}		
		
	});	
		
	
});

// shopping cart
module.controller('ShoppingCartController', function($scope) {});

// search customer
module.controller('SearchCustomerController', function($scope, OrderScreen) {
	
	// event - from OrderScreenController
	$scope.$on('UPDATE_CUSTOMER_LIST', function(event, data){
		
		console.log("refreshing customer list ..");
		
		$scope.getCustomerList();
		
	});
	
	$scope.getCustomerList = function(){
		var customerList = APP.CUSTOMER.getAll();
		this.customerList = customerList;
	};
	
	$scope.getCustomerList();
	
	$scope.setCustomer = function(customer){
		var customer_id = customer.customer_id;
		
		OrderScreen.customer = APP.CUSTOMER.getById( customer_id );
		
		back();
	};
	
	var back = function(){
		
		OrderScreen.shouldShowProductSelector = true;
		OrderScreen.shouldShowSearchCustomer = false;
		
		$scope.searchText = ''; /* clear search box */
		
	};
	
	var clear = function(){
		
		OrderScreen.customer = null;
		
		back();
		
	};
	
	$scope.back = back;
	$scope.clear = clear;
	
});

// create or edit customer
module.controller('CustomerFormController', function($scope, OrderScreen, APP) {
	
	$scope.back = function(){
		
		$scope.reset();
		OrderScreen.reset();		
	};
	
	$scope.reset = function(){	
		
		$scope.name = null;
		$scope.email = null;
		$scope.phone = null;
		
		$scope.ccform.$pristine = true;
		$scope.ccform.$dirty = false;
		
	};
	
	$scope.save = function(){
		
		if($scope.ccform.name.$error.required){
			
			ons.notification.alert({
				title : 'Error',
			    message: 'Name is required!',
			    callback: function() {
			    	// Do something here.
			    }
			});
			
			return;
		}
		
		if($scope.ccform.email.$error.email){
			
			ons.notification.alert({
				title : 'Error',
			    message: 'Please enter a valid e-mail.',
			    callback: function() {
			    	// Do something here.
			    }
			});
			
			return;
		}
		
		var customer = {
				name : $scope.name,
				email : $scope.email,
				phone : $scope.phone,
				customer_id : 0
		};
		
		APP.CUSTOMER.saveCustomer( customer ).done(function( json ){
			
			$scope.$apply(function(){
				OrderScreen.customer = json;			
				$scope.$emit("CUSTOMER_UPDATED", json);			
				$scope.back();
			});
			
			
		}).fail(function(e){
						
			ons.notification.alert({
				  message: e,
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Error',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
			
		});		
		
	};
	
});

// customer details
module.controller('CustomerDetailsController', function($scope, OrderScreen) {
	
});


module.controller('LineDetailsController', function($scope, ShoppingCart, OrderScreen) {	
	
	$scope.plus = function(){
		
		$scope.currentLine.qty = parseFloat($scope.currentLine.qty) + 1;
		
		$scope.computeTotal();
	};
	
	$scope.minus = function(){
		
		if($scope.currentLine.qty == 0) return;
		
		$scope.currentLine.qty = $scope.currentLine.qty - 1;
		
		$scope.computeTotal();
	};
	
	$scope.computePrice = function(){
		
		var line = $scope.currentLine;
		
		line.price = parseFloat(new Number(line.lineNetAmt / line.qty).toFixed(2));
		
	};
	
	$scope.computeTotal = function(){
		
		var line = $scope.currentLine;
		
		line.lineNetAmt = parseFloat(new Number(line.price * line.qty).toFixed(2));
		
	};
	
	$scope.applyChanges = function( index, price, qty, enableTax, note){
		
		//keyboard hack
		qty = parseFloat(qty);
		if(isNaN(qty) || qty == 0){
			
			ons.notification.alert({
				  message: 'Invalid quantity',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Error',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
					  document.getElementById('line-details-qty').focus();
				   	
				  }
				});
			
			return;
			
		}
		
		var modifierChks = jQuery(".modifier-checkbox");
		var modifiers = [];
		var chk;
		var modifier_id;
		var modifier;
		
		for(var i=0; i<modifierChks.length; i++){
			
			chk = modifierChks[i];
			chk = jQuery(chk);
			
			if(chk.is(':checked')){
				
				modifier_id = chk.val();
				
				modifier = APP.MODIFIER.getById( modifier_id );
				
				modifiers.push( modifier );
			}
		}
		
		ShoppingCart.updateLine( index, price, qty , note, modifiers, enableTax);
		
		$scope.back();
	};
	
	$scope.back = function(){
		OrderScreen.reset();
	};
	
	$scope.remove = function( index ){
		
		ShoppingCart.removeLine( index );
		
		$scope.back();
	};
	
	$scope.adjustPrice = function( price ){		
		
		$scope.adjust_price_dialog.hide();
		
		var unitPrice = price / $scope.currentLine.qty;
		
		$scope.currentLine.price = new Number( unitPrice ).toFixed(2);
		
	};
	
	$scope.showAdjustPriceDialog = function( lineTotal ){
		
		$scope.adjust_price_dialog.show({
			
			animation:'slide', 
			callback : function(){
				var input = document.getElementById('adjust_price_dialog_amount');
				input.value = parseFloat(new Number( lineTotal ).toFixed(2));
				input.focus();
			} 
		});
	};
	
	$scope.enableTax = true;
	
	ons.ready(function() {
		
		ons.createDialog('page/adjust-price-dialog.html', {parentScope: $scope}).then(function(dialog) {
			
	      	$scope.adjust_price_dialog = dialog;
	      
	    });
		
	});
	
});


// till
module.controller('TillController', function($scope, APP) {
	
	var terminal = APP.TERMINAL.getById(APP.TERMINAL_KEY);
	var store = APP.STORE.getById(terminal.store_id);
	
	var ctrl = this;
	
	ctrl.terminalInfo = store.name + ", " + terminal.name;
		
	var till_id = APP.TILL_KEY;
	var till = APP.TILL.getById( till_id );
	
	ctrl.till = till;
	
	if(till != null){
		var openby_id  = till['openby'];
		var openby = APP.USER.getById( openby_id );

		ctrl.openby = openby;
		ctrl.today = new Date();
	}
	else
	{
		// update location
		var terminal_id = APP.TERMINAL_KEY;
		var terminal = APP.TERMINAL.getById(terminal_id);
		
		var store_id = terminal['store_id'];		
		var store = APP.STORE.getById( store_id );
		
		ctrl.location = store['address'];
	}
	
	ctrl.adjustTill = function (paytype, amount, reason) {
		
		/*
		$scope.requestPermission('cashadjustment', function(){
			
			_adjustTill( paytype, amount, reason );
			
		});
		*/
		
		_adjustTill( paytype, amount, reason );
		
	};
	
	var _adjustTill = function (paytype, amount, reason) {
		
		if(reason == null){
			ons.notification.alert({
				  message: 'Please enter a reason',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Error',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				   	
				  }
				});
			
			return;
		}
		
		var till_id = APP.TILL_KEY;
		
		var till = APP.TILL.getById( till_id );
		
		if( till == null ){
			
			ons.notification.alert({
	  			  message: 'Failed to adjust till! Could not load till.',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   	
	  			  }
	  			});
			
			return;			
		}
		
		var adjustments = till.adjustments || [];
				
		var adjustment = {
				'datepaid' : new Date().getTime(),
				'user_id' : APP.USER_KEY,
				'paytype' : paytype,
				'reason' : reason,
				'amount' : amount
		};
		
		adjustments.push( adjustment );
		
		till.adjustments = adjustments;
		
		APP.TILL.saveTill( till ).done(function(record, msg){
			console.log( msg );
			
			// todo push sales
			// synchronize();
			
			ons.notification.alert({
	  			  message: 'Till successfully adjusted!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Information',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  				menu.setMainPage('page/till.html', {closeMenu: true});
	  			  }
	  		});// alert
			
		})
		.fail(function(error){
			console.error('Failed to adjust till. ' + error);
			
			ons.notification.alert({
	  			  message: 'Failed to adjust til!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   
	  			  }
	  			});
		});
		
	};
		
	ctrl.openTill = function (openingamt) {
		
		var terminal_id = APP.TERMINAL_KEY;
		var terminal = APP.TERMINAL.getById(terminal_id);
		var terminal_name = terminal['name'];
		
		var store_id = 0;
		var store_name = null;
		
		store_id = terminal['store_id'];
		var store = APP.STORE.getById(store_id);
		store_name = store['name'];
		
		var account_id = 0;
		account_id = terminal['account_id']; 
		
		var openby_id = APP.USER_KEY;
		var openby_user = APP.USER.getById( openby_id );
		var openby_name = openby_user['username'];
		
		var date = moment();	
		var openingdate = date.valueOf();
		var openingdatetext = date.format('DD-MM-YYYY HH:mm:ss');
		var openingdatefull = date.format('MMM Do YYYY, HH:mm');
		
		var till = {
				'account_id' : account_id,
				'store_id' : store_id,
				'store_name' : store_name,
				'terminal_id' : terminal_id,
				'terminal_name' : terminal_name,
				'uuid' : APP.UTILS.UUID.getUUID(),
				'openingdate' : openingdate,
				'openingdatetext' : openingdatetext,
				'openingdatefull' : openingdatefull,
				'openby' : openby_id,
				'openby_name' : openby_name,
				'closingdate' : null,
				'closeby' : null,
				'openingamt' : openingamt,
				'closingamt' : 0,
				/*
				'shift': $scope.shift,
				'isspecialevent': $scope.isSpecialEvent == undefined ? false : $scope.isSpecialEvent,
				'eventname': $scope.eventName == undefined ? null : $scope.eventName,
				'location': $scope.location == undefined ? null : $scope.location,
				'weather': $scope.weather == undefined ? null : $scope.weather,
				'temperature': $scope.temperature == undefined ? null : $scope.temperature,
				'message': $scope.message == undefined ? null : $scope.message,
				*/
				'issync' : 'N',
				'adjustments' : []
		};
		
		var message = till['message'];
		if(message != null && message.length > 0){
			
			// post message to social media
			if( BufferService.isConfigured == true ){
				
				BufferService.updateStatus(BufferService.profile_ids, message, true).done( function ( response ){
					
					console.log( response );
					
				}).fail( function ( error ){
					
					console.log( error );
					
				});
				
			}			
		}
		
		APP.TILL.saveTill( till ).done(function(record, msg){
			console.log( msg );
			
			var till_id = record.till_id;
			APP.TILL_KEY = till_id;
			
			menu.setSwipeable(true);
			menu.setMainPage('page/order-screen.html', {closeMenu: true});
			
		})
		.fail(function(error){
			console.error('Failed to open till. ' + error);
			
			ons.notification.alert({
	  			  message: 'Failed to open til!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   
	  			  }
	  			});
		});
		
	};
	
	ctrl.showCloseTillError = false;
	ctrl.closeTillErrorMessage = "";
	
	ctrl.closeTill = function (closingamt) {
		
		/*
		$scope.requestPermission( "cashup", function(){
			
			_closeTill(closingamt);
			
		} );
		*/
		
		_closeTill(closingamt);
	};
	
	var _closeTill = function (closingamt) {
		
		var till_id = APP.TILL_KEY;
		
		var till = APP.TILL.getById( till_id );
		
		if( till == null ){
			
			ons.notification.alert({
	  			  message: 'Failed to cash up! Could not load till.',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   	
	  			  }
	  			});
			
			return;			
		}
		
		// close till
		
		// get orders
		var orders = APP.ORDER.search({
			'till_id' : till_id, 
			'status' : 'CO'
		});
		
		var cashtotal = 0;
		var cardtotal = 0;
		
		var subtotal = 0;
		var taxtotal = 0;
		var discounttotal = 0;
		var grandtotal = 0;
		var nooforders = orders.length;
		
		var noofitemssold = 0;
		var noofitemsreturned = 0;
		
		//requested feature
		var salestotal = 0;
		var refundtotal = 0;
		
		//RA Cellular vouchers
		var vouchers = {};
		var i, j, orderlines, orderline;
		var k, payment, payments;
		
		for( i=0; i<orders.length; i++ )
		{
			var payments = orders[i].payments;
			
			for( var k = 0; k < payments.length; k++){
				
				payment = payments[k];
				
				if( 'CASH' == payment.type ){
					
					cashtotal = cashtotal + payment.payamt;
				}
				
				if( 'CARD' == payment.type ){
					
					cardtotal = cardtotal + payment.payamt;
				}				
			}
			
			
			
			subtotal = subtotal + orders[i].subtotal;
			taxtotal = taxtotal + orders[i].taxtotal;
			discounttotal = discounttotal + orders[i].discountamt;
			grandtotal = grandtotal + orders[i].grandtotal;
			
			orderlines = orders[i].lines;
			
			for( j=0; j<orderlines.length; j++ )
			{
				orderline = orderlines[j];
				
				if( orderline.qtyentered > 0 )
				{
					noofitemssold = noofitemssold + orderline.qtyentered;
					salestotal = salestotal + orderline.linenetamt;
				}
				else
				{
					noofitemsreturned = noofitemsreturned - orderline.qtyentered;
					refundtotal = refundtotal + + orderline.linenetamt;
				}
				
			}
		}
		
		till.vouchers = vouchers;
		
		// get adjustments
		var adjustmenttotal = 0;
		
		var adjustments = till.adjustments || [];
		var adjustment;
		var adjustment_amount = 0;
		
		for(var i=0; i<adjustments.length; i++)
		{
			adjustment = adjustments[i];
			adjustment_amount = parseFloat(adjustment.amount);
			
			if(adjustment.paytype == 'payin')
			{
				adjustmenttotal = adjustmenttotal + adjustment_amount;
			}
			else
			{
				adjustmenttotal = adjustmenttotal - adjustment_amount;
			}
		}
		
		var openingamt = parseFloat(till.openingamt);
		var expectedamt = openingamt + cashtotal + adjustmenttotal;
		expectedamt = new Number(expectedamt).toFixed(2);
		expectedamt = parseFloat(expectedamt);		
		
		/*
		 * if( expectedamt != closingamt ) { $scope.showCloseTillError = true;
		 * $scope.expectedAmt = expectedamt;
		 * 
		 * return; }
		 */
		
		var date = moment();	
		var closingdate = date.valueOf();
		var closingdatetext = date.format('DD-MM-YYYY HH:mm:ss');
		var closingdatefull = date.format('MMM Do YYYY, HH:mm');
		
		var closeby_id = APP.USER_KEY;
		var closeby_user = APP.USER.getById( closeby_id );
		var closeby_name = closeby_user[ 'username' ];
		
		till.closeby = closeby_id;
		till.closeby_name = closeby_name;
		till.closingdate = closingdate;
		till.closingdatetext = closingdatetext;
		till.closingdatefull = closingdatefull;
		
		till.closingamt = _round(closingamt);
		
		// other amounts
		till.cashamt = _round(cashtotal);	
		till.card = _round(cardtotal);	
		till.adjustmenttotal = _round(adjustmenttotal);
		
		till.subtotal = _round(subtotal);
		till.taxtotal = _round(taxtotal);
		till.discounttotal = _round(discounttotal);
		till.grandtotal = _round(grandtotal);
		
		till.nooforders = nooforders;
		till.noofitemssold = noofitemssold;
		till.noofitemsreturned = noofitemsreturned;
		
		//requested feature
		till.salestotal = _round(salestotal);
		till.refundtotal = _round(refundtotal);
		
		//RA Cellular vouchers
		till.vouchers = vouchers;
		
		//document no
		till.documentno = APP.UTILS.ORDER.getCashUpDocumentNo();
		
		APP.TILL.saveTill( till ).done(function(record, msg){
			console.log( msg );
			
			// todo push sales
			// synchronize();
			
			if(APP.PRINTER_SETTINGS.isPrinterEnabled()){
				// print receipt
				
				APP.printTill( record ).done(function(msg){
					
					
					
				}).fail(function(error){			
					APP.showError(error, 'Printer Error');
					/* dfd.reject(error); */
					
				});
			}
			
			ons.notification.alert({
	  			  message: 'Cash Up completed',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Information',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  				
	  				modal.show();
	  				
	  				APP.pushData().done(function(){
	  					
	  					ons.notification.alert({
	  					  message: 'Synchronization completed!',
	  					  // or messageHTML: '<div>Message in HTML</div>',
	  					  title: 'Information',
	  					  buttonLabel: 'OK',
	  					  animation: 'default', // or 'none'
	  					  // modifier: 'optional-modifier'
	  					  callback: function() {
	  					    // Alert button is closed!
	  						menu.setSwipeable(false);
			  				menu.setMainPage('page/open-till.html', {closeMenu: true});
	  					  }
	  					});
	  					
	  				}).fail(function(){
	  					
	  					ons.notification.alert({
		  					  message: 'Failed to synchronize till and orders!',
		  					  // or messageHTML: '<div>Message in HTML</div>',
		  					  title: 'Error',
		  					  buttonLabel: 'OK',
		  					  animation: 'default', // or 'none'
		  					  // modifier: 'optional-modifier'
		  					  callback: function() {
		  					    // Alert button is closed!
		  						menu.setSwipeable(false);
				  				menu.setMainPage('page/open-till.html', {closeMenu: true});
		  					  }
		  					});
	  					
	  				}).always(function(){
	  					modal.hide();
	  				});
	  				
	  			  }
	  			});
			
		})
		.fail(function(error){
			console.error('Failed to close till. ' + error);
			
			ons.notification.alert({
	  			  message: 'Failed to close til!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   
	  			  }
	  			});
		});
	};
	
	
	ctrl.goToCloseTillPage = function(){
		
		$scope.requestPermission( "cashup", function(){
			
			menu.setMainPage('page/close-till.html', {closeMenu: true, callback:function(){
				
				document.getElementById('close-till-amount').focus();
				
			}});
			
		} );
		
		
	};
	
	
	ctrl.goToAdustTillPage = function(){
		
		$scope.requestPermission( "cashadjustment", function(){
			
			menu.setMainPage('page/adjust-till.html', {closeMenu: true, callback:function(){
				
				//document.getElementById('close-till-amount').focus();
				
			}});
			
		} );
	};
	
	ctrl.press = function(key){
	  	  
  	  var string = ctrl.amount || "";
  	  
  	  switch(key){
  	  
  	  case 'backspace' : 
  		  
  		  string = string.slice(0,string.length-1);		    		  
  		  break;
  		  
  	  case '+/-' : 
  		  
  		  if(string.indexOf('-') == 0)
  		  {
  			  string = string.slice(1);	
  		  }
  		  else
  		  {
  			  string = "-" + string;
  		  }
  		  
  		  break;
  		  
  	  case '.' : 
  		  
  		  if(string.indexOf('.') == -1){
  			  
  			  if(string.length == 0){
  				  string = string + "0";
  			  }
  			  
  			  string = string + '.';
  		  }
  		  break;
  		  
  	  default:
  		  string = string + key;		    	  	
  	  }
  	  
  	  console.log(string);
  	    	  
  	  ctrl.amount = string;
  	  
    };
	
});

// Printing
module.controller('PrinterSettingsController', function($scope, $timeout, OrderScreen, APP) {
	
	var settings = APP.PRINTER_SETTINGS.getSettings();
	
	//set defaults
	settings.lineWidth = settings.lineWidth || 40;
	 
	$scope.settings = settings;
	
	var printer = PrinterManager.getPrinter();
	
	printer.getPrinters().done(function(printers){
		
		$timeout(function() {
			$scope.printers = printers;
		});
		
		
	}).fail(function(error){
		
		ons.notification.alert({
			  message: error,
			  title: 'Error',
			  callback: function() {
			    // Alert button is closed!
				// menu.setMainPage('page/order-screen.html', {closeMenu:
				// true});
			  }
			});
		
	});
	
	$scope.save = function(){
		
		if( this.validatePrinter() && this.validatePoleDisplay() ){
			
			APP.PRINTER_SETTINGS.saveSettings( $scope.settings );
			
			ons.notification.alert({
				  message: 'Printer settings successfully saved.',
				  title: 'Information',
				  callback: function() {
				    // Alert button is closed!
					// menu.setMainPage('page/order-screen.html', {closeMenu:
					// true});
				  }
				});
			
		}
		
	};
	
	$scope.testPrinter = function(){
		
		if(this.validatePrinter()){
			
			modal.show();
			
			APP.PRINTER_SETTINGS.testPrinterSettings( $scope.settings ).done(function(){
				
			}).fail(function(){
				
				ons.notification.alert({
		  			  message: 'Failed to test printer.',
		  			  title: 'Error',
		  			  callback: function() {
		  			    // Alert button is closed!
		  				// menu.setMainPage('page/order-screen.html',
						// {closeMenu: true});
		  			  }
		  			});
				
			}).always(function(){
				
				modal.hide();
				
			});			
		}
	};
	
	
	$scope.testPoleDisplay = function(){	
		if(this.validatePoleDisplay()){
			
			modal.show();
			
			APP.PRINTER_SETTINGS.testPoleDisplaySettings( $scope.settings ).done(function(){
				
			}).fail(function(){
				
				ons.notification.alert({
		  			  message: 'Failed to pole display.',
		  			  title: 'Error',
		  			  callback: function() {
		  			    // Alert button is closed!
		  				// menu.setMainPage('page/order-screen.html',
						// {closeMenu: true});
		  			  }
		  			});
				
			}).always(function(){
				
				modal.hide();
				
			});			
		}
	};
	
	$scope.validatePrinter = function(){
		
		if(this.settings.enablePrinter){
			//validate printer settings
			//validate printer name
			if(this.settings.printerName == null || this.settings.printerName == ""){
				
				ons.notification.alert({
		  			  message: 'Choose a printer.',
		  			  title: 'Error',
		  			  callback: function() {
		  			    // Alert button is closed!
		  			  }
		  			});
				
				return false;
			}
			
			this.settings.lineWidth = parseInt(this.settings.lineWidth);
			
			//validate printer line width
			if(isNaN(this.settings.lineWidth)){				
				
				ons.notification.alert({
		  			  message: 'Enter a valid line width',
		  			  title: 'Error',
		  			  callback: function() {
		  			    // Alert button is closed!
		  				  
		  				  document.getElementById('printer-line-width-text').select();
		  			  }
		  			});
				
				return false;
			}
		}	
		
		return true;
	};
	
	$scope.validatePoleDisplay = function(){
				
		if(this.settings.enablePoleDisplay){
			//validate pole display settings
			//validate pole display name
			if(this.settings.poleDisplayName == null || this.settings.poleDisplayName == ""){
				
				ons.notification.alert({
		  			  message: 'Choose a pole display.',
		  			  title: 'Error',
		  			  callback: function() {
		  			    // Alert button is closed!
		  			  }
		  			});
				
				return false;
			}
		}
		
		
		return true;
	};
	
	$scope.showPoleDisplaySettings = function(){
		
		return !isCordovaApp; //show except for cordova
		
	};
});

// Cayan Settings

// Hold Order History
module.controller('HoldOrdersController', function($scope, ShoppingCart, OrderScreen) {
	
		
	$scope.loadOrders = function(){
		$scope.orders  = APP.ORDER.search({status : 'DR'});
	};
	
	// initialise orders
	$scope.loadOrders();
	
	$scope.viewOrder = function ( order ){
		$scope.current_order = order;
	};
	
	$scope.isSelected = function( order ){
		
		if( $scope.current_order != null && $scope.current_order.order_id == order.order_id){
			
			return "selected";
			
		}
		
		return "";
	};
	
	$scope.recallOrder = function( order ){
		
		var customer_id = order["customer_id"];
		var customer = APP.CUSTOMER.getById( customer_id );
		
		OrderScreen.customer = customer;
		OrderScreen.order_id = order["order_id"];
		OrderScreen.uuid = order["uuid"];		
		
		var cart = ShoppingCart;
		cart.clear();
		
		// add note
		cart.addNote( order.note );
		
		// add lines
		var olines = order.lines;
		var oline = null;
		var l = null;
		
		for(var i = 0; i < olines.length; i++){
			oline = olines[i];
			
			l = cart.addLine(oline.product_id, oline.qtyentered);
			cart.updateLine(l.index, oline.priceentered, oline.qtyentered, oline.note, oline.modifiers);
		}
		
		menu.setMainPage('page/order-screen.html', {closeMenu: true});
		
	};
	
	$scope.closeOrder = function( order ){
		
		$scope.requestPermission( "deleteholdorders",  function(){
			
			_closeOrder( order );	
			
		} );
		
	};
	
	var _closeOrder = function( order ){
		
		var order_id = order["order_id"];
		
		APP.ORDER.remove( order_id ).done(function(){
			
			$scope.$apply(function(){
				$scope.loadOrders();
				$scope.current_order = null;
			});
			
		});
	};
	
	$scope.closeAllOrders = function(){
		
		$scope.requestPermission( "deleteholdorders",  function(){
			
			_closeAllOrders();	
			
		} );
		
	};
	
	var _closeAllOrders = function(){
		
		ons.notification.confirm({
			  message: 'Do you want to close all hold orders?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Confirmation',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){	
			    	
			    	var orders = APP.ORDER.search({status : 'DR'});		
					
					if(orders.length == 0){
						return;
					}
					
					var order = null;
					var promises = [];
					
					for(var i=0; i< orders.length; i++){
						
						order = orders[i];
						var order_id = order['order_id'];
						
						promises.push( APP.ORDER.remove( order_id ));
					}
					
					jQuery.when.apply( jQuery, promises ).done(function() {        
				        for (var i = 0, j = arguments.length; i < j; i++) {
				        	if(arguments[i]) console.log(arguments[i]);
				        }
				        
				        console.log('orders cleared.');
				        
				        APP.ORDER.cache({status : 'DR'}).remove();
				        
				        $scope.$apply(function(){
				        	$scope.loadOrders();
				        	$scope.current_order = null;
						});
				        
				    }).fail(function() {        
				        for (var i = 0, j = arguments.length; i < j; i++) {
				        	if(arguments[i]) console.error(arguments[i]);
				        }
				        
				        console.log('Failed to clear orders!');
				    });
			    	
			    }
			  }
		});		
		
	};
	
});

// Today Orders
module.controller('TodayOrdersController', function($scope, ShoppingCart, OrderScreen) {
	
	var today = moment().startOf('day').valueOf();	
	
	$scope.loadOrders = function(){
		
		var orders  = APP.ORDER.search({status : ['CO','VO'], dateordered : {'>' : today}});
		//var orders  = APP.ORDER.cache({status : ['CO','VO']}).order("dateordered desc").limit(100).get();
		
		// use moment js
		for(var i=0; i<orders.length; i++){
			orders[i].xxx = new Date(orders[i].dateordered);
		}
		
		$scope.orders = orders;
	};
	
	$scope.viewOrder = function ( order ){
		$scope.current_order = order;
	};
	
	$scope.isSelected = function( order ){
		
		if( $scope.current_order != null && $scope.current_order.order_id == order.order_id){
			
			return "selected";
			
		}
		
		return "";
	};
	
	$scope.loadOrders();
	
	$scope.refundOrderConfirmation = function( order ){
		
		$scope.requestPermission( "refundsales", function(){
			
			_refundOrderConfirmation( order );
			
		} );
		
	};
	
	var _refundOrderConfirmation = function( order ){
		
		ons.notification.confirm({
			  message: 'Do you want to refund order?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Confirmation',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){
			    	
			    	$scope.refundOrder( order );			    			    	
			    }
			  }
			});	
		
	};
	
	$scope.voidOrderConfirmation = function( order ){
		
		$scope.requestPermission( "voidsales", function(){
			
			_voidOrderConfirmation( order );
			
		} );
		
	};
	
	var _voidOrderConfirmation = function( order ){
		
		ons.notification.confirm({
			  message: 'Do you want to void order?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Confirmation',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){
			    	
			    	$scope.voidOrder( order );
			    	
			    }
			  }
			});	
		
	};
	
	$scope.voidOrder = function( order ){
		
		var order_id = order["order_id"];
		
		modal.show();
		
		APP.voidOrder( order_id ).done(function(msg){
						
			ons.notification.alert({
	  			  message: 'Order successfully voided!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Information',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			    
	  			    $scope.$apply(function(){
	  			    	
	  			    	$scope.loadOrders();
	  			    	
	  			    });	  				
	  			    
	  			  }
	  			});
			
			
			
		}).fail(function(error){
			
			ons.notification.alert({
	  			  message: 'Failed to void order!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			  }
	  			});
			
		}).always(function(){
			
			modal.hide();
			
		});
		
	};
	
	$scope.refundOrder = function( order ){
		
		var order_id = order["order_id"];		
		var customer_id = order["customer_id"];
		
		var customer = APP.CUSTOMER.getById( customer_id );
		
		OrderScreen.customer = customer;
		OrderScreen.ref_order_id = order["order_id"];
		OrderScreen.ref_uuid = order['uuid'];		
		
		var cart = ShoppingCart;
		cart.clear();
		
		// add refund note
		// cart.addNote( order.note );
		
		// add lines
		var olines = order.lines;
		var oline = null;
		var l = null;
		
		for(var i = 0; i < olines.length; i++){
			oline = olines[i];
			
			if( oline.qtyentered < 0) continue; /* cannot refund negative */
			
			l = cart.addLine(oline.product_id, oline.qtyentered * -1, false);
			
			// index, price, qty, note, modifiers, enableTax
			cart.updateLine(l.index, oline.priceentered, oline.qtyentered * -1, oline.note, oline.modifiers, oline.enabletax);
		}
		
		menu.setMainPage('page/order-screen.html', {closeMenu: true});
	};
	
	
	$scope.reprintOrder = function( order ){
		
		$scope.requestPermission( "reprint", function(){
			
			_reprintOrder( order );
			
		} );
		
	};
	
	var _reprintOrder = function( order ){
		
		if(APP.PRINTER_SETTINGS.isPrinterEnabled()){
			// print receipt
			
			APP.printOrder( order, true ).done(function(msg){
				
			}).fail(function(error){			
				APP.showError(error, 'Printer Error');
			});
		}
		
	};
	
});

module.service('APP', function() {return APP;});



module.controller('SocialMediaController', function($scope) {
	
	$scope.publish = function(){
		
		var message = $scope.message;
		
		// post message to social media
		if( BufferService.isConfigured == true ){
			
			modal.show();
			
			BufferService.updateStatus(BufferService.profile_ids, message, true).done( function ( response ){
				
				ons.notification.alert({
					  message: 'Message has been posted',
					  // or messageHTML: '<div>Message in HTML</div>',
					  title: 'Information',
					  buttonLabel: 'OK',
					  animation: 'default', // or 'none'
					  // modifier: 'optional-modifier'
					  callback: function() {
					    // Alert button is closed!
					  }
					});
				
			}).fail( function ( error ){
				
				ons.notification.alert({
		  			  message: 'Failed to post message! ' + error,
		  			  // or messageHTML: '<div>Message in HTML</div>',
		  			  title: 'Social Post Error',
		  			  buttonLabel: 'OK',
		  			  animation: 'default', // or 'none'
		  			  // modifier: 'optional-modifier'
		  			  callback: function() {
		  			    // Alert button is closed!
		  			  }
		  			});
				
			}).always(function(){
				
				modal.hide();
				
			});
			
		}
		else
		{
			ons.notification.alert({
	  			  message: 'Buffer is not configured for this account!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Social Post Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			  }
	  			});
		}
		
	};
	
});


module.controller('BackOfficeController', function($scope){
	
	 var setStatus = function( status ){
			
		$scope.$apply(function(){
			$scope.status = status;
		});
		
	};
	
	var server_endpoint_url = APP.SERVER_ENDPOINT_URL;
	// validate server endpoint url
	
	if( server_endpoint_url == null ){
		// go to settings
		menu.setMainPage('page/settings.html', {closeMenu: true});
		modal.hide();
		return;
	}
		
	var frame = document.getElementById("back-office-url");
	
	 frame.src = server_endpoint_url;
	 
	 $scope.status = "Loading BackOffice. Please wait ...";
	 
	 angular.element(document).ready(function () {
		 
		 $(frame).on('load', function(){
			 
		        $('#loader').hide();
		        $(frame).show();
		        
		    });
		 
		});
    
    /*var user = APP.USER.getById(APP.USER_KEY);
    $scope.user = user;
    
    $scope.$emit('userEvent', $scope.user);*/
});

function transportwebcallback( response ){
	
	console.log( response );
	
}

/*
 * 
 * ons.setDefaultDeviceBackButtonListener(function() { if
 * (navigator.notification.confirm("Are you sure to close the app?",
 * function(index) { if (index === 1) { // OK button navigator.app.exitApp(); //
 * Close the app } } )); });
 * 
 * <ons-page ng-device-backbutton="doSomething()"> Some page content </ons-page>
 */

module.directive('selectOnFocus', function() {
	return {
		restrict: 'A',
		link: function(scope, element)
		{
			element.on("focus", function()
			{
				element.select();
			});
		}
	};
});


//Directive
module.directive('ngEnter', function () {
	
    return function(scope, element, attrs) {
    	
        element.bind('keydown keypress', function(event) {
        	
            if (event.which === 13) {
            	
                scope.$apply(function() {
                	scope.$eval(attrs.ngEnter || attrs.ngClick, {$event:event});
                });
                
                event.preventDefault();
            }
        });
    };
});

module.directive('convertToNumber', function() {
	  return {
	    require: 'ngModel',
	    link: function(scope, element, attrs, ngModel) {
	      ngModel.$parsers.push(function(val) {
	        return parseFloat(val);
	      });
	      ngModel.$formatters.push(function(val) {
	        return '' + val;
	      });
	    }
	  };
	});


module.controller("CashDialogController", function($scope, $timeout, OrderScreen){
	
	var ctrl = this;
	ctrl.dialog = $scope.cash_dialog;	
	
	ctrl.cancel = function(){
		ctrl.cash_dialog_amount = "";
		ctrl.cash_dialog_error = false;
		ctrl.cash_dialog_error_message = "";
		
		cash_dialog_global.hide();
		
		OrderScreen.selectSearch();
	};
	
	ctrl.ok = function(){
		this.validate();
	};
	
	ctrl.validate = function(){		    	  
  	  
  	  var amountEntered = parseFloat(ctrl.cash_dialog_amount);
  	  
  	  if(isNaN(amountEntered)){
  		  
  		ctrl.cash_dialog_error = true;
  		ctrl.cash_dialog_error_message = 'Invalid amount';
  		  
  		  return;
  	  }
  	  
  	  var cart = $scope.cart;	    	  
  	  
  	  if(cart.grandtotal > amountEntered){
  		
  		ctrl.cash_dialog_error = true;
  		ctrl.cash_dialog_error_message = 'Amount tendered cannot be less that ' + new Number(cart.grandtotal).toFixed(2);
  		  
  		return;
  		  
  	  }
  	  
	  cash_dialog_global.hide({animation:'slide'});		    	  
	  ctrl.cash_dialog_amount = null;
	  ctrl.cash_dialog_error = false;
	  ctrl.cash_dialog_error_message = null;
	  	  
	  $scope.checkout([{
		  amount : cart.grandtotal,
		  type : 'CASH',
		  tendered : amountEntered,
		  change : parseFloat( new Number(amountEntered - cart.grandtotal).toFixed(2) )
	  }]);
  	  
    };
	
	ctrl.press = function(key){
  	  
  	  var string = ctrl.cash_dialog_amount || "";
  	  
  	  switch(key){
  	  
  	  case 'backspace' : 
  		  
  		  string = string.slice(0,string.length-1);		    		  
  		  break;
  		  
  	  case '+/-' : 
  		  
  		  if(string.indexOf('-') == 0)
  		  {
  			  string = string.slice(1);	
  		  }
  		  else
  		  {
  			  string = "-" + string;
  		  }
  		  
  		  break;
  		  
  	  case '.' : 
  		  
  		  if(string.indexOf('.') == -1){
  			  
  			  if(string.length == 0){
  				  string = string + "0";
  			  }
  			  
  			  string = string + '.';
  		  }
  		  break;
  		  
  	  default:
  		  string = string + key;		    	  	
  	  }
  	  
  	  console.log(string);
  	  //var value = parseFloat(string);		    	  
  	  //console.log(value);
  	  
  	  //textfield.value = string;
  	  /*
  	  $timeout(function(){
  		  ctrl.cash_dialog_amount = string;
  		  $scope.cash_dialog_textfield.value = string;
  	  });
  	  */
  	  
  	  ctrl.cash_dialog_amount = string;
  	  
    };
	
});

module.controller("SplitDialogController", function($scope, $timeout, OrderScreen){
	
	var ctrl = this;
	
	ctrl.mode = 'CASH';
	
	ctrl.remainder = function(){
		
		var total = $scope.cart.grandtotal;
		var cashamttendered = parseFloat(ctrl.cash_amount || 0);
  	   	var cardamt = parseFloat(ctrl.card_amount || 0);
  	   	
  	   	var remainder = parseFloat(new Number(total - cashamttendered - cardamt).toFixed(2));
  	   	
  	   	return remainder;
		
	};
	
	ctrl.cancel = function(){
		
		ctrl.mode = 'CASH';
		ctrl.cash_amount = null;
		ctrl.card_amount = null;
		
		split_dialog_global.hide();
		
		OrderScreen.selectSearch();
		
	};
	
	ctrl.ok = function(){
		
		if(this.validate()){
			
			var cashamttendered = parseFloat(ctrl.cash_amount);
	  	   	var cardamt = parseFloat(ctrl.card_amount);
	  	   
	  	   	var cartTotal = $scope.cart.grandtotal;
	  	   	var paidamt = cashamttendered + cardamt;
	  	   
	  	   	var change = parseFloat(new Number(paidamt - cartTotal).toFixed(2));
	  	   	var cashamt = parseFloat(new Number(cartTotal - cardamt).toFixed(2)); 
			
			var cashPayment = {
		  			  'amount' : cashamt,
		  			  'type' : 'CASH',
		  			  'tendered' : cashamttendered,
		  			  'change' : change
		  		  };
			   
			 var cardPayment = {
		  			  'amount' : cardamt,
		  			  'type' : 'CARD'
		  		  };
			   
			 $scope.checkout([ cardPayment, cashPayment ]); /* print card first then cash */
			 
			 ctrl.cancel();
			 
		}
		
		
	};
	
	ctrl.validate = function(){		    	  
  	  
  	   var cashamttendered = parseFloat(ctrl.cash_amount || 0);
  	   var cardamt = parseFloat(ctrl.card_amount || 0);
  	   
  	   var cartTotal = $scope.cart.grandtotal;
  	   var paidamt = cashamttendered + cardamt;
  	   
  	   if( cashamttendered < 0 || cardamt < 0 ) return false;
  	   
  	   return paidamt >= cartTotal;    	   
  	  
    };
	
	ctrl.press = function(key){
  	  		
  	  var string = ctrl.mode == 'CARD' ? ( ctrl.card_amount || "" ) : ( ctrl.cash_amount || "" );
  	  
  	  string = "" + string;
  	  
  	  switch(key){
  	  
  	  case 'backspace' : 
  		  
  		  string = string.slice(0,string.length-1);		    		  
  		  break;
  		  
  	  case '+/-' : 
  		  
  		  if(string.indexOf('-') == 0)
  		  {
  			  string = string.slice(1);	
  		  }
  		  else
  		  {
  			  string = "-" + string;
  		  }
  		  
  		  break;
  		  
  	  case '.' : 
  		  
  		  if(string.indexOf('.') == -1){
  			  
  			  if(string.length == 0){
  				  string = string + "0";
  			  }
  			  
  			  string = string + '.';
  		  }
  		  break;
  		  
  	  default:
  		  string = string + key;		    	  	
  	  }
  	  
  	  console.log(string);
  	  
  	  
  	  if(ctrl.mode == 'CARD'){
  		  
  		ctrl.card_amount = string; 
  		ctrl.cash_amount = parseFloat(new Number( $scope.cart.grandtotal - parseFloat(ctrl.card_amount) ).toFixed(2));
  		
  	  }
  	  else
  	  {
  		ctrl.cash_amount = string;  		
  		ctrl.card_amount = parseFloat(new Number( $scope.cart.grandtotal - parseFloat(ctrl.cash_amount) ).toFixed(2));
  	  }
  	  
  	  
    };
	
});

module.controller("OpenItemDialogController", function($scope, $timeout, OrderScreen){
	
	var ctrl = this;
	
	ctrl.open_item_name = 'Open Item';
	ctrl.open_item_price = null;
	ctrl.open_item_taxable = true;

	ctrl.addPrice = function( name, price, isTaxable ){
		
		price = parseFloat(new Number(price).toFixed(2))
	        
        var line = ShoppingCart.addLine( APP.OPEN_ITEM_PRODUCT_ID, 1 );
        var index = line.index;
        
        line.product.name = name;
        line.product.sellingprice = price
        line.enableTax = isTaxable;
        line.price = price;
        line.discountAmt = 0;
        line.discountPercentage = 0;
        
        line.updateTotal();
        
        ShoppingCart.updateTotal();       
        
        ctrl.closeDialog();
	};

	ctrl.closeDialog = function(){
	        
        ctrl.resetOpenItem();        
        open_item_dialog_global.hide();	
        
        OrderScreen.selectSearch();
	};

	ctrl.resetOpenItem = function(){
	        
        ctrl.open_item_name = 'Open Item';
        ctrl.open_item_price = null;
        ctrl.open_item_taxable = true;
	};
	
	ctrl.press = function(key){
	  	  
	  	  var string = ctrl.open_item_price || "";
	  	  
	  	  switch(key){
	  	  
	  	  case 'backspace' : 
	  		  
	  		  string = string.slice(0,string.length-1);		    		  
	  		  break;
	  		  
	  	  case '+/-' : 
	  		  
	  		  if(string.indexOf('-') == 0)
	  		  {
	  			  string = string.slice(1);	
	  		  }
	  		  else
	  		  {
	  			  string = "-" + string;
	  		  }
	  		  
	  		  break;
	  		  
	  	  case '.' : 
	  		  
	  		  if(string.indexOf('.') == -1){
	  			  
	  			  if(string.length == 0){
	  				  string = string + "0";
	  			  }
	  			  
	  			  string = string + '.';
	  		  }
	  		  break;
	  		  
	  	  default:
	  		  string = string + key;		    	  	
	  	  }
	  	  
	  	  console.log(string);
	  	  	  	  
	  	  ctrl.open_item_price = string;
	  	  
	  };
	
});

module.controller("AboutDialogController", function($scope, $timeout){
	
	var ctrl = this;
	ctrl.dialog = $scope.about_dialog;
	
	var account_key = APP.ACCOUNT_KEY;		
	var terminal_key = APP.TERMINAL_KEY;
	var terminal = APP.TERMINAL.getById( terminal_key );
	var last_updated = APP.getLastUpdatedLocal(); //local time
	
	ctrl.business_name = APP.ACCOUNT.getById( account_key ).businessname;
	ctrl.terminal_name = terminal.name;
	
	ctrl.store_name = APP.STORE.getById( terminal.store_id ).name;
	ctrl.server_endpoint_url = APP.SERVER_ENDPOINT_URL;
	
	ctrl.version = APP_VERSION;
	ctrl.last_updated = last_updated;
	
	ctrl.closeDialog = function(){        
		about_dialog_global.hide();	
	};
	
});

module.controller("CreateItemDialogController", function($scope, $http, $timeout, OrderScreen){
	
	var ctrl = this;
	var tax_id = null;
	var tax = null;
	
	var item = {
			"upc" : $scope.barcode,
			"istaxincluded" : 'Y',
			"sellingprice" : 0,
			"costprice" : 0,
			"ismodifier" : 'N'
	};	
	
	ctrl.taxList = APP.TAX.cache({isactive:'Y'}).order("rate asec").get();	
	ctrl.categoryList = APP.PRODUCT_CATEGORY.cache({isactive:'Y'}).order("name asec").get();
	
	//set default tax	
	for( var i=0; i<ctrl.taxList.length; i++ ){
		
		tax = ctrl.taxList[i];
		
		if( tax.rate > 0 ){
			item.tax_id = tax.tax_id;
			
			break;
		}
	}
	
	ctrl.item = item;
	
	/*ctrl.createItemDialog = function( name, productcategory_id, sellingprice, istaxincluded, tax_id, costprice ){
		
		
		//APP.PRODUCT.cache.insert(item);
		
		//var line = ShoppingCart.addLine( product_id, 1 );
        //var index = line.index;
        
        //line.product.name = name;
        //line.enableTax = isTaxable;
        
        //ShoppingCart.updatePrice( index, price );
        
        //ctrl.closeDialog();
	}*/
	
	ctrl.createItem = function(){
		
		//validation
		if(ctrl.item.name == null || ctrl.item.name.length == 0){
			
			ons.notification.alert({
				  message: 'Item Name is required!',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Information',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
			
			return;
			
		}
		
		//validation
		if(ctrl.item.productcategory_id == null || ctrl.item.productcategory_id == ''){
			
			ons.notification.alert({
				  message: 'Item Category is required!',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Information',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
			
			return;
			
		}
		
		//validation
		if(ctrl.item.tax_id == null || ctrl.item.tax_id == ''){
			
			ons.notification.alert({
				  message: 'Tax is required!',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Information',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
			
			return;
			
		}
		
		//validation
		if(ctrl.item.sellingprice == null || ctrl.item.sellingprice == ''){
			
			ons.notification.alert({
				  message: 'Selling price is required!',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Information',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
			
			return;
			
		}
		else if(isNaN(parseFloat(ctrl.item.sellingprice))){
			
			ons.notification.alert({
				  message: 'Inavlid Selling price!',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Information',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
			
			return;
			
		}
		else{
			
		}
		
		//validation
		if(ctrl.item.costprice == null || ctrl.item.costprice == ''){
			
			ons.notification.alert({
				  message: 'Cost price is required!',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Information',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
			
			return;
			
		}
		else if(isNaN(parseFloat(ctrl.item.costprice))){
			
			ons.notification.alert({
				  message: 'Inavlid Cost price!',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Information',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
			
			return;
			
		}
		else{
			
		}
		
		/*ctrl.item.name = name;
		ctrl.item.productcategory_id = productcategory_id;
		ctrl.item.sellingprice = sellingprice;
		ctrl.item.istaxincluded = istaxincluded;
		ctrl.item.tax_id = tax_id;
		ctrl.item.costprice = costprice;*/	
		
		modal.show();
		
		APP.PRODUCT.saveProduct( item ).done(function( product ){
			
			$timeout(function(){
				$scope.$emit("PRODUCT_UPDATED", product);
			});			
			
		}).fail(function(e){
						
			ons.notification.alert({
				  message: e,
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Error',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
					OrderScreen.selectSearch();
				  }
				});
			
		}).always(function(){
			
			modal.hide();
			ctrl.closeDialog();
			
		});
		
		
		
	};
	
	ctrl.closeDialog = function(){        
		create_item_dialog_global.hide();
		OrderScreen.selectSearch();
	};
	
});

module.controller("SellingPriceController", function($scope, $timeout, OrderScreen){
	
	var ctrl = this;
	
	ctrl.cancel = function(){
		ctrl.selling_price_dialog_amount = "";
		ctrl.selling_price_dialog_error = false;
		ctrl.selling_price_dialog_error_message = "";
		
		selling_price_dialog_global.hide();
		
		OrderScreen.selectSearch();
	};
	
	ctrl.ok = function(){
		this.validate();
	};
	
	ctrl.validate = function(){		    	  

		var priceEntered = parseFloat(ctrl.selling_price_dialog_amount);

		if(isNaN(priceEntered)){

			ctrl.selling_price_dialog_error = true;
			ctrl.selling_price_dialog_error_message = 'Invalid amount';

			return;
		}

		var product = $scope.selling_price_dialog.product;
		product['sellingprice'] = priceEntered;
		
		modal.show();

		APP.PRODUCT.saveProduct( product ).done(function( response ){			
			
			$timeout(function(){
				$scope.$emit("PRODUCT_UPDATED", response);
			});			

		}).fail(function(e){

			ons.notification.alert({
				message: e,
				// or messageHTML: '<div>Message in HTML</div>',
				title: 'Error',
				buttonLabel: 'OK',
				animation: 'default', // or 'none'
				// modifier: 'optional-modifier'
				callback: function() {
					// Alert button is closed!
				}
			});

		}).always(function(){
			
			modal.hide();
			
			ctrl.cancel();
			
		});	

	};
    
    ctrl.press = function(key){
    	  
    	  var string = ctrl.selling_price_dialog_amount || "";
    	  
    	  switch(key){
    	  
    	  case 'backspace' : 
    		  
    		  string = string.slice(0,string.length-1);		    		  
    		  break;
    		  
    	  case '+/-' : 
    		  
    		  if(string.indexOf('-') == 0)
    		  {
    			  string = string.slice(1);	
    		  }
    		  else
    		  {
    			  string = "-" + string;
    		  }
    		  
    		  break;
    		  
    	  case '.' : 
    		  
    		  if(string.indexOf('.') == -1){
    			  
    			  if(string.length == 0){
    				  string = string + "0";
    			  }
    			  
    			  string = string + '.';
    		  }
    		  break;
    		  
    	  default:
    		  string = string + key;		    	  	
    	  }
    	  
    	  ctrl.selling_price_dialog_amount = string;
    	  
      };
	
});

module.controller("VariableItemController", function($scope, $timeout, OrderScreen){
	
	var ctrl = this;
	
	ctrl.cancel = function(){
		ctrl.variable_item_dialog_qty = "";
		ctrl.variable_item_dialog_error = false;
		ctrl.variable_item_dialog_error_message = "";
		
		variable_item_dialog_global.hide();
		
		OrderScreen.selectSearch();
	};
	
	ctrl.ok = function(){
		this.validate();
	};	
	
	ctrl.validate = function(){		    	  

		var qtyEntered = parseFloat(ctrl.variable_item_dialog_qty);

		if(isNaN(qtyEntered)){

			ctrl.variable_item_dialog_error = true;
			ctrl.variable_item_dialog_error_message = 'Invalid qty';

			return;
		}

		var product = $scope.variable_item_dialog.product;
		var product_id = product['product_id'];		
		
		var line = ShoppingCart.addLine( product_id, qtyEntered );
			
		ctrl.cancel();
	};
	
	ctrl.press = function(key){
  	  
  	  var string = ctrl.variable_item_dialog_qty || "";
  	  
  	  switch(key){
  	  
  	  case 'backspace' : 
  		  
  		  string = string.slice(0,string.length-1);		    		  
  		  break;
  		  
  	  case '+/-' : 
  		  
  		  if(string.indexOf('-') == 0)
  		  {
  			  string = string.slice(1);	
  		  }
  		  else
  		  {
  			  string = "-" + string;
  		  }
  		  
  		  break;
  		  
  	  case '.' : 
  		  
  		  if(string.indexOf('.') == -1){
  			  
  			  if(string.length == 0){
  				  string = string + "0";
  			  }
  			  
  			  string = string + '.';
  		  }
  		  break;
  		  
  	  default:
  		  string = string + key;		    	  	
  	  }
  	  
  	  ctrl.variable_item_dialog_qty = string;
  	  
    };
	
});

module.controller('SearchProductController', function( $scope, $timeout, OrderScreen ) {
	
	var ctrl = this;
	
	ctrl.results = [];
	ctrl.message = null;
	
	ctrl.close = function(){
		
		this.results = [];
		this.message = null;
		this.searchTerm = null;
		
		OrderScreen.reset();
		
	};	
	
	//todo
	ctrl.addItem = function(){
		
	};
	
	ctrl.search = function(){
		
		var searchTerm = ctrl.searchTerm;
		
		var results = APP.PRODUCT.search({ 'upc' : searchTerm, 'isactive' : 'Y' });
		
		if( results.length > 0 ){
			var product = results[0];
			var product_id = product['product_id'];
			
			$timeout(function(){
				
				$scope.addLine( product_id , 1);				
				
			});	
			
			ctrl.close();
		}
		else
		{			
			results = APP.PRODUCT.search({'name':{'leftnocase':searchTerm}, 'isactive' : 'Y'});
			ctrl.results = results;
			
			if(results.length == 0){
				
				ctrl.message = "No items found for '" + searchTerm + "'";
			}
			else if( results.length > 24){
				
				ctrl.message = "Showing first 24 of " + results.length + " items";
				
			}
			else
			{
				ctrl.message = null;
			}
			
			selectSearchProduct();
			
		}
		
	};
	
});

module.controller('RequestPermissionController', function( $scope ) {
	
	var ctrl = this;
	
	var userList = APP.USER.getAll();
	ctrl.userList = userList;
	
	ctrl.reset = function(){
		
		ctrl.pin = "";
		ctrl.user_id = -1;
	};
	
	
	ctrl.ok = function(){
		
		var dialog = $scope.request_permission_dialog;
		
		var callback = dialog.callback;
		var permission = dialog.permission;
		
		var user_id = ctrl.user_id;
		var pin = ctrl.pin;
		
		var user = APP.USER.getById( user_id );
		
		if(user == null){
			
			dialog.hide();
			
			var activeElement = document.activeElement;
			activeElement.blur();
			
			ons.notification.alert({
	  			  message: 'User not found!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {	  				  
	  				activeElement.focus();		  				
	  				dialog.show();
	  			    
	  			  }
	  			});
			
			return;
		}
		else
		{
			if( user['pin'] != pin ){
				
				dialog.hide();
				
				var activeElement = document.activeElement;
				activeElement.blur();
				
				ons.notification.alert({
		  			  message: 'Invalid PIN!',
		  			  // or messageHTML: '<div>Message in HTML</div>',
		  			  title: 'Error',
		  			  buttonLabel: 'OK',
		  			  animation: 'default', // or 'none'
		  			  // modifier: 'optional-modifier'
		  			  callback: function() {
		  			    // Alert button is closed!
		  				activeElement.focus();		  				
		  				dialog.show();
		  			  }
		  			});
				
				return;
				
			}
			else
			{
				/* validate permission */
				if( user['isadmin'] == 'Y' ){
					
					callback();
					
				}
				else
				{
					/* parse permission */
					var permissions = JSON.parse( user.permissions || '{}' );
					
					if( permissions[ permission ] == 'Y' ){
						
						callback();
					}
					else
					{
						dialog.hide();
						
						var activeElement = document.activeElement;
						activeElement.blur();
						
						ons.notification.alert({
			  			  message: 'User does not have permission',
			  			  // or messageHTML: '<div>Message in HTML</div>',
			  			  title: 'Error',
			  			  buttonLabel: 'OK',
			  			  animation: 'default', // or 'none'
			  			  // modifier: 'optional-modifier'
			  			  callback: function() {
			  			    // Alert button is closed!
			  				activeElement.focus();		  				
			  				dialog.show();
			  			  }
			  			});
						
						return;
					}
				}//else
			}
		}
		
		ctrl.cancel();
		
	};
	
	/* hides popup and reset form */
	ctrl.cancel = function(){		
		ctrl.reset();
		$scope.request_permission_dialog.hide();
	};
	
	
	ctrl.press = function(key){
	  	  
  	  var string = ctrl.pin || "";
  	  
  	  switch(key){
  	  
  	  case 'backspace' : 
  		  
  		  string = string.slice(0,string.length-1);		    		  
  		  break;
  		  
  	  case '+/-' : 
  		  
  		  if(string.indexOf('-') == 0)
  		  {
  			  string = string.slice(1);	
  		  }
  		  else
  		  {
  			  string = "-" + string;
  		  }
  		  
  		  break;
  		  
  	  case '.' : 
  		  
  		  if(string.indexOf('.') == -1){
  			  
  			  if(string.length == 0){
  				  string = string + "0";
  			  }
  			  
  			  string = string + '.';
  		  }
  		  break;
  		  
  	  default:
  		  string = string + key;		    	  	
  	  }
  	    	  
  	  ctrl.pin = string;
  	  
    };
	
});


module.controller('MenuController', function($scope, $timeout){
	
	var ctrl = this;
	
	ctrl.getUserName = function(){
		
		if(APP.USER){
			
			var user = APP.USER.getById( APP.USER_KEY );
			
			if(user) return user.username;
			
		}
		
		return "";
		
	};
	
	ctrl.getStoreTerminal = function(){
		
		if(APP.STORE && APP.TERMINAL){
			
			var terminal = APP.TERMINAL.getById(APP.TERMINAL_KEY);
			
			if(terminal){
				
				var store = APP.STORE.getById(terminal.store_id);
				
				if(store){
					return store.name + ", " + terminal.name;
				}			
				
			}
			
		}
		
		return "";
	}
		
	ctrl.openDrawer = function(){
				
		$scope.requestPermission('opendrawer', function(){
			
			console.log('opening drawer ...');
			
			APP.PRINTER.openDrawer();
			
		});		
		
	};
	
});

/***************************************************************/
/*
module.controller('MyController', function($scope) {
    $scope.MyDelegate = {
      countItems: function() {
        // Return number of items.
        return $scope.grid.length;
      },

      calculateItemHeight: function(index) {
        // Return the height of an item in pixels.
        return 100;
      },

      configureItemScope: function(index, itemScope) {
        // Initialize scope
        itemScope.row = $scope.grid[index];
      },

      destroyItemScope: function(index, itemScope) {
        // Optional method that is called when an item is unloaded.
        console.log('Destroyed item with index: ' + index);
      }
    };
  });
  */

/* round amt to 2dp */
var _round = function(amt, scale){
	
	var precision = scale || 2;
	
	var val = amt + "";
	
	if( val.indexOf('.') != -1) {
		
		/* pad val with 00001 */
		
		var padded = val + "00001";
		
		return parseFloat(new Number( padded ).toFixed(precision));
		
	}
	else
	{
		return parseFloat(amt);
	}
	
};
