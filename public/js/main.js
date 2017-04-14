angular.module('app', [
	'app.config',
	'app.controllers',
	'app.services',
	'app.directives',
	'ui.router',
	'ngFileUpload',
	'ngAnimate',
	'ngSanitize',
	'ngDialog'
])

.config(function ($compileProvider, $animateProvider, $locationProvider, $httpProvider, ngDialogProvider) {
	// Needed for routing to work
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel):/);

	$httpProvider.defaults.withCredentials = true;
	$httpProvider.interceptors.push('AuthInterceptor');

	/*
	$locationProvider.html5Mode({
		enabled: true
	});
	*/

	$animateProvider.classNameFilter(/nga/);

	if ( window.innerWidth < 720 ) {
    	window.isMobile = true;
    } else {
    	window.isMobile = false;
    }

    window.spinOpts = {
		  lines: 13 // The number of lines to draw
		, length: 28 // The length of each line
		, width: 14 // The line thickness
		, radius: 42 // The radius of the inner circle
		, scale: 1 // Scales overall size of the spinner
		, corners: 1 // Corner roundness (0..1)
		, color: '#fff' // #rgb or #rrggbb or array of colors
		, opacity: 0.25 // Opacity of the lines
		, rotate: 0 // The rotation offset
		, direction: 1 // 1: clockwise, -1: counterclockwise
		, speed: 1 // Rounds per second
		, trail: 60 // Afterglow percentage
		, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
		, zIndex: 2e9 // The z-index (defaults to 2000000000)
		, className: 'spinner' // The CSS class to assign to the spinner
		, top: '50%' // Top position relative to parent
		, left: '50%' // Left position relative to parent
		, shadow: false // Whether to render a shadow
		, hwaccel: false // Whether to use hardware acceleration
		, position: 'fixed' // Element positioning
	}

    ngDialogProvider.setDefaults({
        className: 'ngdialog-theme-som',
        plain: false,
        showClose: true,
        closeByDocument: true,
        closeByEscape: true
    });
})

.run(function($rootScope, $window, $location, $state, $urlRouter) {
    window.addEvent = function(elem, type, eventHandle) {
        // addEventListener to e.g. window, resize etc
        if (elem == null || typeof(elem) == 'undefined') return;
        if ( elem.addEventListener ) {
            elem.addEventListener( type, eventHandle, false );
        } else if ( elem.attachEvent ) {
            elem.attachEvent( "on" + type, eventHandle );
        } else {
            elem["on"+type]=eventHandle;
        }
    };

    addEvent(window, 'resize', function() {
    	if ( window.innerWidth < 720 ) {
	    	window.isMobile = true;
	    } else {
	    	window.isMobile = false;
	    }
    });

    addEvent(window, 'keydown', function(e) {
		if ( e.metaKey ) {
			$rootScope.metaKey = true;
		}
	});
	addEvent(window, 'keyup', function(e) {
		if ( !e.metaKey ) {
			$rootScope.metaKey = false;
		}
	});
})

.config(function($stateProvider, $urlRouterProvider) {

$stateProvider
 	/*
	 * NAV
	 */
	.state('nav', {
		url: '',
		templateUrl: '/templates/navigation.html',
		controller: 'NavigationCtrl',
	  	abstract: true
	})


	/*
	 * Countdown
	 */
	.state('nav.countdown', {
		url: '/countdown',
		views: {
			'main@nav': {
				templateUrl: '/templates/countdown.html'
			}
		},
	})


	/*
	 * Sold Out
	 */
	.state('nav.sold-out', {
		url: '/ausverkauft',
		views: {
			'main@nav': {
				templateUrl: '/templates/sold-out.html'
			}
		},
	})


	/*
	 * Signup
	 */
	.state('nav.signup', {
		url: '/tickets',
		views: {
			'main@nav': {
				templateUrl: '/templates/signup.html',
				controller: 'SignupCtrl'
			}
		},
		resolve: {
			tickets: function(Tickets) {
				return Tickets.getAll()
				.success(function(res) {
					return res.tickets;
				});
			}
		}
	})
	.state('nav.signup-completed', {
		url: '/erfolgreich-registriert',
		views: {
			'main@nav': {
				templateUrl: '/templates/signup-completed.html',
				controller: 'SignupCompletedCtrl'
			}
		}
	})


	/*
	 * Guest
	 */
	.state('nav.guest', {
		url: '/gast/:gid',
		abstract: true,
		views: {
			'main@nav': {
				templateUrl: '/templates/guest.html',
				controller: 'GuestCtrl'
			}
		},
		resolve: {
			guest: function($stateParams, Guest) {
				return Guest.get($stateParams.gid)
				.success(function(results) {
					return results.guest;
				})
				.error(function(err) {
					console.log(err);
				});
			}
		},
	})
	.state('nav.guest.profile', {
		url: '/profil',
		resolve: {
			guest: function(guest) {
				return guest;
			}
		},
		views: {
			'content@nav.guest': {
				templateUrl: '/templates/guest.profile.html'
			}
		}
	})
	.state('nav.guest.einzelgespraeche', {
		url: '/einzelgespraeche',
		resolve: {
			guest: function(guest) {
				return guest;
			}
		},
		views: {
			'content@nav.guest': {
				templateUrl: '/templates/guest.einzelgespraeche.html'
			}
		}
	})


	/*
	 * Company
	 */
	.state('nav.company', {
		url: '/co/:cid',
		// abstract: true,
		views: {
			'main@nav': {
				templateUrl: '/templates/company.html',
				controller: 'CompanyCtrl'
			}
		},
		resolve: {
			company: function($stateParams, Company) {
				return Company.get($stateParams.cid)
				.success(function(results) {
					return results.company;
				})
				.error(function(err) {
					console.log(err);
				})
			}
		},
	})
	.state('nav.company.applicants', {
		url: '/bewerber',
		resolve: {
			company: function(company) {
				return company;
			}
		},
		views: {
			'content@nav.company': {
				templateUrl: '/templates/company.applicants.html'
			}
		}
	})


	/*
	 * Admin
	 */
	.state('nav.admin', {
		url: '/admin',
		//abstract: true,
		views: {
			'main@nav': {
				templateUrl: '/templates/admin.html',
				controller: 'AdminCtrl'
			}
		},
		resolve: {
			guests: function($stateParams, Guest, Tickets) {
				return Guest.getAll()
				.success(function(results) {
					return results.guests;
				})
				.error(function(err) {
					console.log(err);
				});
			},

			tickets: function(Tickets) {
				return Tickets.getAll()
				.success(function(res) {
					return res.tickets;
				});
			}
		}
	})
	.state('nav.admin.guests', {
		url: '/guests',
		resolve: {
			guests: function(guests) {
				return guests;
			}
		},
		views: {
			'content@nav.admin': {
				templateUrl: '/templates/admin.guests.html'
			}
		}
	})
	.state('nav.admin.tickets', {
		url: '/themenkreise',
		resolve: {
			tickets: function(tickets) {
				return tickets;
			}
		},
		views: {
			'content@nav.admin': {
				templateUrl: '/templates/admin.tickets.html'
			}
		}
	})

	;

	$urlRouterProvider.otherwise('/'+window.path);
});










