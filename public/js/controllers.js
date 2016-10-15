angular.module('app.controllers', ['app.config'])

.controller('NavigationCtrl', function($scope, $state, ngDialog) {
	$scope.openLoginDialog = function() {
		var dialog = ngDialog.open({
			templateUrl: '/templates/login.modal.html',
			controller: 'LoginCtrl'
	    });

	    dialog.closePromise.then(function(results) {
	    	if ( _.contains(['$escape','$closeButton','$document'], results.value) ) return;
	    	$state.go(results.value.redirectState, results.value.redirectParams);
	    });
	}
})

.controller('LoginCtrl', function($scope, $rootScope, Auth) {
	$scope.credentials = {};

	$scope.send = function(isValid) {
		if ( !isValid ) return;

		$scope.loginForm.submitted = true;

		Auth.login($scope.credentials)
		.success(function(res) {
			$rootScope.auth = true;
			$scope.closeThisDialog(res);
		})
		.error(function(err, status) {
			console.log(err, status);

			if ( status == 401 ) {
				$scope.loginForm.email.$invalid 	= true;
				$scope.loginForm.password.$invalid 	= true;
			} else {
				swal('Error!', 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut!', 'warning');
			}
		});
	}
})

.controller('SignupCtrl', function($scope, $rootScope, $state, Signup, tickets) {
	$scope.tickets = tickets.data.tickets;

	$scope.signup = {};

	$scope.selectTicket = function(ticket) {
		if ( ticket.status == 'sold-out' ) return;
		_.each($scope.tickets, function(ticket) { ticket.selected=false; });
		ticket.selected = 'selected';
	}

	$scope.signup = function(isValid) {
		var s = $scope.signup;

		if ( !isValid ) return;
		if ( $scope.signupForm.$submitted ) return;

		var ticket = _.find($scope.tickets, function(ticket) { return ticket.selected=='selected' });
		if ( !ticket ) { return swal('Ticket auswählen', 'Bitte wähle ein Ticket für einen Themenkreis aus', 'warning'); }

		var data = {
			salutation: s.salutation,
			firstname: s.firstname,
			lastname: s.lastname,
			email: s.email,
			one_on_one: s.oneOnOne,
			student: s.student,
			ticket_id: ticket.id,
			aftershow: s.aftershow,
			alumni: s.alumni,
			alumniCode: s.alumniCode
		}

		$scope.signupForm.$submitted = true;

		Signup.send(data)
		.success(function(res) {
			$rootScope.signup = data;
			$state.go('nav.signup-completed');
		})
		.error(function(err, status) {
			$scope.signupForm.$submitted = false;

			if ( status == 403 ) {
				if ( err.code == 'already-registred' ) {
					return swal('Bereits angemeldet', 'Diese E-Mail Adresse ist bereits angemeldet. Bitte nutze eine andere E-Mail Adresse oder kontaktieren unser Team unter d.jaacks@som2016.de.', 'error');
				} else if ( err.code == 'wrong-alumniCode' ) {
					return swal('Error', 'Der eigegebene SOM Alumni Code ist ungültig', 'error');
				} else if ( err.code == 'sold-out' ) {
					return swal('Ausverkauft', 'Der von Dir ausgewählte Themenkreis ist leider schon ausverkauft. Bitte wähle einen anderen.', 'error');
				} else if ( err.code == 'not-yet' ) {
					return swal('Earlybird, hm?', 'Der Vorverkauf ist noch nicht freigeschaltet aber netter Versuch.', 'error');
				}
			}

			swal({
				title: "Error",
				text: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
				type: "error",
				showCancelButton: false,
				closeOnConfirm: true
			}, function() {
				//console.log('nothing');
			});
		});
	}
})

.controller('SignupCompletedCtrl', function($scope, $rootScope, $state) {
	if ( !$rootScope.signup ) return $state.go('nav.signup');
	$scope.guest = $rootScope.signup;
	$scope.guest.hello = ($scope.guest.salutation == 'Frau' ? 'Liebe ' : 'Lieber ') + $scope.guest.firstname + ',';
})

.controller('GuestCtrl', function($scope, guest, Guest) {
	$scope.guest 		= guest.data.guest;
	$scope.ticket 		= guest.data.ticket;
	$scope.companies 	= guest.data.companies;

	$scope.upload = function(file) {
		Overlay.show();
		var spinner = new Spinner(spinOpts).spin(document.body);

	    Guest.uploadCv(file)
		.progress(function(evt) {
			var prct = parseInt(100.0 * evt.loaded / evt.total);

	        if ( prct > 99 ) {
	        	console.log('uploaded to server');
	        }
		})
		.success(function(results) {
			$scope.guest.cv = results.cvkey;
			
			spinner.stop();
 			Overlay.hide();
		})
		.error(function() {
			spinner.stop();
 			Overlay.hide();

	        swal('Error', 'Ein unerwarter Fehler ist aufgetreten. Versuch es erneut mit einer anderen PDF. Sollte der Fehler weiterhin auftreten wende Dich bitte an d.jaacks@som2016.de', 'error');
		});
	}

	$scope.toggleCo = function(co) {
		if ( co.selected ) {
			Guest.updateCo(co.id, 'delete')
			.success(function() {
				co.selected = false;
			});
		} else {
			Guest.updateCo(co.id, 'add')
			.success(function() {
				co.selected = true;
			});
		}
	}
})

.controller('CompanyCtrl', function($scope, company) {
	$scope.company 		= company.data.company;
	$scope.applicants 	= company.data.applicants;
})

.controller('AdminCtrl', function($scope, guests, tickets, Guest) {
	$scope.guests 	= guests.data.guests;
	$scope.tickets 	= tickets.data.tickets;

	$scope.setDelivered = function(guest, state) {
		if ( state == 1 ) {
			var delivered 		= 1;
			var delivered_text 	= 'abgeholt';
		} else if ( state == 0 ) {
			var delivered 		= 0;
			var delivered_text 	= 'ausstehend';
		}

		swal({
			title: "Eingabe bestätigen",
			text: "Willst Du "+guest.firstname+ " wirklich als "+delivered_text+" markieren?",
			type: delivered == 1 ? 'success' : 'error',
			showCancelButton: true,
			closeOnConfirm: true
		}, function() {
			Guest.setDelivered(guest.id, state)
			.success(function() {
				guest.delivered 		= delivered;
				guest.delivered_text 	= delivered_text;
			})
			.error(function() {
				console.log('error');
			});
		});
	}
})

;







