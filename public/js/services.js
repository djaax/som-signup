angular.module('app.services', [])

.factory('Signup', function($http) {
	return {
		send: function(data) {
			return $http.post('/api/signup', { data: data });
		}
	}
})

.factory('Guest', function($http, Upload) {
	return {
		get: function(gid) {
			return $http.get('/api/guest/' + gid);
		},
		getAll: function() {
			return $http.get('/api/guests');
		},
		uploadCv: function(file, meta) {
	        return Upload.upload({
	            url: '/api/upload/cv',
	            method: 'POST',
	            file: file
	        });
	    },
	    updateCo: function(cid, state) {
	    	return $http.post('/api/guest/co', { cid: cid, state: state });
	    },
	    setDelivered: function(gid, state) {
	    	return $http.post('/api/guest/'+gid+'/set/delivered/'+state);
	    }
	}
})

.factory('Tickets', function($http) {
	return {
		getAll: function() {
			return $http.get('/api/tickets');
		}
	}
})

.factory('Company', function($http) {
	return {
		get: function(cid) {
			return $http.get('/api/company/' + cid);
		},
		getAll: function(cid) {
			return $http.get('/api/companies');
		}
	}
})

.factory('Auth', function($http) {
	return {
		login: function(creds) {
			return $http.post('/auth/login', { email: creds.email, password: creds.password });
		}
	}
})

.factory('AuthInterceptor', function($q, $location, $window) {
    return {
        request: function (config) {
        	/*
            var setHeader = function(token) {
                config.headers = config.headers || {};
                config.headers.Authorization = 'Bearer ' + token;
            }

            if ( $window.localStorage.token ) {
                setHeader($window.localStorage.token);
            }
            */
            return config;
        },
        responseError: function(rejection) {
            if ( rejection.status === 401 ) {
                console.log('401');
                window.location = '/#/'+window.path;
            }

            return $q.reject(rejection);
        }
    };
})

/*
$httpProvider.interceptors.push(function($q, $location) {
		return {
			response: function(response) {
				// do something on success return response;
				return $q.reject(response);
			},
			responseError: function(response) {
				if (response.status === 401) {
					window.location = '/#/registrieren';
				}

				return $q.reject(response);
			}
		};
	});
	*/

;