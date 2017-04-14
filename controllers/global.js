var express				= require('express'),
	_ 					= require('underscore'),
	fs					= require('fs'),
	hogan				= require('hogan.js'),
	async   			= require('async'),
	http 				= require('http'),
	moment 				= require('moment'),
	request 			= require('request'),
	generatePassword    = require('password-generator'),
	passport 			= require('passport'),
	path 				= require('path');
	
module.exports = function(app) {
	var server = express();

	/*
     * CREATE SERVER
     */
    var server = express();

    server.get('/', function(req, res) {
        app.sql.query('SELECT themenkreise.*, COUNT(guests.ticket_id) as sold FROM themenkreise LEFT JOIN guests ON themenkreise.id = guests.ticket_id GROUP BY themenkreise.id', function(err, results) {
            if (err) throw err;

            var ticketsAvailable = _.some(_.map(results, function(i) {
                return i.sold < i.max_stock;
            }));

            var path;
            if ( !ticketsAvailable ) {
                path = 'ausverkauft';
            } else if ( moment().unix() < app.config.start ) {
                path = 'countdown';
            } else if ( moment().unix() > app.config.start && ticketsAvailable ) {
                path = 'tickets';
            }

            var indexTpl = hogan.compile(fs.readFileSync(app.dir + '/public/start.html', 'utf-8'));
            res.set('Content-Type', 'text/html');
            res.send(indexTpl.render({ path }));
        });
    });


    /*
     * Get Themenkreise
     */
    server.get('/api/tickets', function(req, res) {
    	app.sql.query('SELECT themenkreise.*, COUNT(guests.ticket_id) as sold FROM themenkreise LEFT JOIN guests ON themenkreise.id = guests.ticket_id GROUP BY themenkreise.id', function(err, themenkreise) {
    		if (err) throw err;

    		// check for sold-out
            // threshold for status change to <short>
            var threshold = .4;
    		_.each(themenkreise, function(ticket) {
                if ( ticket.max_stock <= ticket.sold) {
                    ticket.status       = 'sold-out';
                    ticket.status_text  = 'ausverkauft';
                } else if ( ticket.max_stock - ticket.sold < ticket.max_stock * threshold ) {
                    ticket.status       = 'short';
                    ticket.status_text  = 'wenige verfügbar';
                } else {
                    ticket.status       = 'available';
                    ticket.status_text  = 'verfügbar';
                }
    		});

    		res.status(200).send({
                tickets: themenkreise,
                ticketPrice: app.config.ticketPrice,
                priceAftershow: app.config.priceAftershow,
                discountStudent: app.config.discountStudent
            });
    	});
    });


    /*
     *
     * /
    server.get('/dummy/:ticket_id', function(req, res) {
        var data = {
            salutation: 'Herr',
            firstname: 'Max',
            lastname: 'Mustermann',
            email: 'test@dustinjaacks.de',
            one_on_one: 1 || false,
            student: 1 || false,
            ticket_id: req.params.ticket_id,
            aftershow: 1 || false,
            alumni: 1 || false,
            timestamp: moment().unix(),
            password: 'passwort',
            toPay: 0
        }

        app.sql.query('INSERT INTO guests SET ?', [data], function(err, results) {
            if (err) throw err;
            res.sendStatus(200);
        });
    });
    /**/


    /*
     * Signup
     */
    server.post('/api/signup', function(req, res) {
    	var raw = req.body.data;

        var data = {
            salutation: raw.salutation,
            firstname: raw.firstname,
            lastname: raw.lastname,
            email: raw.email,
            one_on_one: raw.one_on_one || false,
            student: raw.student || false,
            ticket_id: raw.ticket_id,
            aftershow: raw.aftershow || false,
            alumni: raw.alumni || false,
            timestamp: moment().unix()
        }

        if ( moment().unix() < app.config.start && data.lastname !== 'Admin' ) {
            return res.status(403).send({ code: 'not-yet' });
        }

        var ticketPrice     = app.config.ticketPrice,
            priceAftershow  = app.config.priceAftershow,
            discountStudent = app.config.discountStudent;

    	var getTicketPrice = function(price) {
            if ( data.alumni && !data.aftershow ) {
                return 0;
            } else if ( data.alumni && data.aftershow ) {
                return priceAftershow;
            } else if ( !data.student && !data.aftershow && !data.alumni ) {
    			return price;
    		} else if ( !data.student && data.aftershow && !data.alumni ) {
    			return (price + priceAftershow);
    		} else if ( data.student && !data.aftershow && !data.alumni ) {
    			return (price - discountStudent);
    		} else if ( data.student && data.aftershow && !data.alumni ) {
    			return (price - discountStudent + priceAftershow);
    		}
    	}

        if ( data.alumni && raw.alumniCode !== app.config.alumni ) {
            return res.status(403).send({ code: 'wrong-alumniCode' });
        }

    	// Set Password
    	var password 	= generatePassword(6) + generatePassword(3, false, /\d/);
    	data.toPay 		= getTicketPrice(ticketPrice);

        app.sql.query('SELECT themenkreise.*, COUNT(guests.ticket_id) as sold FROM themenkreise LEFT JOIN guests ON themenkreise.id = guests.ticket_id WHERE themenkreise.id = ? AND NOT(guests.delivered = 3)', [data.ticket_id], function(err, results) {
            if (err) throw err;

            var ticket = results[0];
            if ( ticket.max_stock == ticket.sold ) {
                return res.status(403).send({ code: 'sold-out' });
            }

        	app.sql.query('SELECT id FROM guests WHERE email = ?', [data.email], function(err, results) {
        		if (err) throw err;

        		if ( results.length > 0 ) {
        			// email already registered
        			return res.status(403).send({ code: 'already-registred' });
        		}

        		data.password = app.utils.md5(password);
    	    	app.sql.query('INSERT INTO guests SET ?', [data], function(err, results) {
    	    		if (err) throw err;

                    var salutation  = data.salutation == 'Frau' ? 'Liebe' : 'Lieber';
                    var participant = data.salutation == 'Frau' ? 'Teilnehmerin' : 'Teilnehmer';
    	    		
    	    		/* send mail */
    				app.sendgrid.send({
    					to:       data.email,
    					from:     'vorverkauf@symposium-oeconomicum.de',
    					subject:  '[SOM 2016] Erfolgreich registriert!',
    					html:     salutation +' '+ data.firstname + ',<br/><br/>hier ist Dein persönliches Passwort: '+password+'<br/><br/>Logge Dich unter vorverkauf.symposium-oeconomicum.de ein und überprüfe Dein Teilnehmerprofil.<br/><br/>Als '+participant+' des Symposiums hast Du außerdem die exklusive Möglichkeit, Dich für Einzelgespräche mit der Allianz und zeb zu bewerben. Zusätzlich hast du die Chance, am 03. Mai 2016 beim Workshop mit KPMG dabei zu sein.<br/><br/>Was du tun musst? Es ist ganz einfach: Logge Dich mit Deinem Passwort ein, lade Deinen Lebenslauf hoch und wähle das oder die Unternehmen aus, die Dein Interesse geweckt haben.<br/><br/>Wir freuen uns auf Dich<br/><br/>Dein Team des 29. Symposium Oeconomicum Muenster'
    				}, function(err, json) {
    					if (err) { return console.error(err); }
    				});
    				/**/

                    delete data.password;
                    // console.log('Signup', data);
                    if ( app.env.NODE_ENV == 'production' ) {
                        app.slack.send({
                            text: 'Neuer Signup für den Vorverkauf',
                            channel: '#vorverkauf',
                            icon_url: 'http://symposium-oeconomicum.de/logo-100x100.png',
                            username: 'vorverkauf',
                            fields: data
                        });
                    }
                    /**/

    	    		res.sendStatus(200);

                    /*
                     * Set Rooms: Derjenige TK der am wenigsten Reservierungen hat bekommt den kleinsten Raum zugeteilt.
                     *
                     * Nicht für den Nach-Verkauf! (Auskommentieren)
                     *
                     */
                    var rooms = [45, 95, 100, 100, 105, 110]; // S6, S2, S9, S8, S1, S10
                    app.sql.query('SELECT themenkreise.*, COUNT(guests.ticket_id) as sold FROM themenkreise LEFT JOIN guests ON themenkreise.id = guests.ticket_id GROUP BY themenkreise.id ORDER BY sold', function(err, themenkreise) {
                        if (err) throw err;

                        var i = 0;
                        async.eachSeries(themenkreise, function(ticket, callback) {
                            app.sql.query('UPDATE themenkreise SET max_stock = ? WHERE id = ?', [rooms[i], ticket.id], function(err, results) {
                                if (err) return callback(err);
                                i++;
                                return callback();
                            });
                        }, function(err) {
                            if (err) throw err;
                        });
                    });
                    /**/
    	    	});
            });
    	});
    });


    /*
     * Login
     * /
    server.post('/auth/login', function(req, res) {
    	var email 		= req.body.email,
    		password 	= req.body.password;

    	app.sql.query('SELECT id, password, type FROM guests WHERE email = ?', [email], function(err, results) {
    		if (err) throw err;

    		if ( results.length == 0 ) {
    			// not registered
    			return res.sendStatus(403);
    		} else if ( results[0].password !== password ) {
    			// wrong password
    			return res.sendStatus(403);
    		}

    		var user = results[0];
    		res.status(200).send({ redirectState: 'nav.guest.profile', redirectParams: { gid: user.id } });
    	});
    });
    */


    /*
     * Passport Auth
     */
    server.post('/auth/login', app.passport.authenticate('local'), function(req, res) {
	 	if ( req.user.type == 'guest' ) {
	 		var redirect = { redirectState: 'nav.guest.profile', redirectParams: { gid: req.user.id } };
	 	} else if ( req.user.type == 'company' ) {
	 		var redirect = { redirectState: 'nav.company.applicants', redirectParams: { cid: req.user.id } };
	 	} else if ( req.user.type == 'admin' ) {
            var redirect = { redirectState: 'nav.admin.guests', redirectParams: {} };
        }

		res.status(200).send(redirect);
	});
	/**/
 
 	/*/>
	server.post('/login', function(req, res, next) {
		console.log('login');

		passport.authenticate('local', function(err, user, info) {
		    if (err) { return next(err); }

		    if (!user) { return res.redirect('/login'); }
		    req.logIn(user, function(err) {
		    	if (err) { return next(err); }
		    	return res.redirect('/users/' + user.username);
		    });
		})(req, res, next);
	});
	/**/

	// route to log out
	server.get('/auth/logout', function(req, res) {
		req.logOut();
		res.redirect('/#/sold-out');
	});


    /*
     * Get Guest
     */
    server.get('/api/guest/:id', app.auth.guest, function(req, res) {
    	app.sql.query('SELECT * FROM guests JOIN themenkreise ON guests.ticket_id = themenkreise.id WHERE guests.id = ?', [req.params.id], function(err, results) {
    		if (err) throw err;
    		var guest = results[0];

    		app.sql.query('SELECT * FROM themenkreise WHERE id = ?', [guest.ticket_id], function(err, results) {
    			if (err) throw err;
    			var ticket = results[0];

    			app.sql.query('SELECT * FROM companies', function(err, companies) {
    				if (err) throw err;

    				app.sql.query('SELECT * FROM one_on_one WHERE gid = ?', [req.params.id], function(err, results) {
    					if (err) throw err;

    					// Get selected companies and mark them as selected.
    					var selected = _.pluck(results, 'cid');
    					_.each(companies, function(co) { co.selected = _.contains(selected, co.id) ? true : false });

    					res.status(200).send({ guest: guest, ticket: ticket, companies: companies });
    				});
    			});
    		});
    	});
    });


    /*
     * Get All Guests
     */
    server.get('/api/guests', app.auth.admin, function(req, res) {
        app.sql.query('SELECT * FROM guests ORDER BY delivered, timestamp', function(err, guests) {
            if (err) throw err;
            _.each(guests, function(guest) {
                guest.name = guest.firstname + ' ' + guest.lastname;

                if ( guest.delivered == 1 ) {
                    guest.delivered_text = 'abgeholt';
                } else {
                    guest.delivered_text = 'ausstehend';
                }

                if ( guest.aftershow == 1 ) {
                    guest.aftershow_text = 'Ja';
                } else {
                    guest.aftershow_text = 'Nein';
                }
            });

            res.status(200).send({ guests: guests });
        });
    });


    /*
     * Set Delivered
     */
    server.post('/api/guest/:gid/set/delivered/:state', app.auth.admin, function(req, res) {
        var delivered = req.params.state == 1 ? moment().unix() : 0;
        app.sql.query('UPDATE guests SET delivered = ? WHERE id = ?', [delivered, req.params.gid], function(err, results) {
            if (err) throw err;
            res.sendStatus(200);
        });
    });


    /*
     * Update Co for One on One
     */
    server.post('/api/guest/co', app.auth.guest, function(req, res) {
    	var cid 	= req.body.cid,
    		state 	= req.body.state;

    	var next = function(err, results) {
    		if (err) throw err;
    		res.sendStatus(200);
    	}
    
    	if ( state == 'add' ) {
    		app.sql.query('INSERT INTO one_on_one SET ?', [{ cid: cid, gid: req.user.id }], next);
    	} else if ( state == 'delete' ) {
    		app.sql.query('DELETE FROM one_on_one WHERE cid = ? AND gid = ?', [cid, req.user.id], next);
    	}
    });


    /*
     * Upload CV
     */
    server.post('/api/upload/cv', app.auth.guest, app.upload.single('file'), function(req, res) {
        // deadline over
        //return res.sendStatus(403);

        if ( !req.file ) return res.sendStatus(400);

        var filename = req.file.filename + path.extname(req.file.originalname);
    	fs.rename(app.dir + '/' + req.file.path, app.dir + '/uploads/' + filename);
    	
    	app.sql.query('UPDATE guests SET cv = ? WHERE id = ?', [filename, req.user.id], function(err, results) {
    		if (err) throw err;
    		res.status(200).send({ cvkey: filename });
    	});
    });


    /*
     * Download CV
     */
    server.get('/api/dn/cv/:cvkey', function(req, res) {
    	app.sql.query('SELECT guests.id, guests.cv, guests.firstname, guests.lastname FROM guests WHERE guests.cv = ?', [req.params.cvkey], function(err, results) {
    		if (err) throw err;

            if ( results.length == 0 ) {
                return res.sendStatus(404);
            }

    		var filestream = fs.createReadStream(app.dir + '/uploads/' + results[0].cv);
    		res.setHeader('Content-disposition', 'attachment; filename="' + results[0].firstname + '-' + results[0].lastname + path.extname(results[0].cv) + '"');
            res.setHeader('Content-type', 'pdf');
            filestream.pipe(res);
    	});
    });


    /*
     * Companies
     */
    server.get('/api/companies', app.auth.guest, function(req, res) {
    	app.sql.query('SELECT * FROM companies', function(err, companies) {
    		if (err) throw err;
    		res.status(200).send({ companies: companies });
    	});
    });


    /*
     * Company
     */
    server.get('/api/company/:cid', app.auth.company, function(req, res) {
    	app.sql.query('SELECT * FROM companies WHERE id = ?', [req.params.cid], function(err, results) {
    		if (err) throw err;
    		if ( !results.length ) return res.sendStatus(404);

    		var company = results[0];

    		app.sql.query('SELECT guests.firstname, guests.lastname, guests.cv FROM guests JOIN one_on_one ON guests.id = one_on_one.gid WHERE one_on_one.cid = ? AND NOT(guests.cv=?)', [req.params.cid, ''], function(err, applicants) {
    			if (err) throw err;

	    		res.status(200).send({ company: company, applicants: applicants });
	    	});
    	});
    });


    /*
     * Get Themenkreise
     */
    server.get('/api/tks', function(req, res) {
        app.sql.query('SELECT * FROM themenkreise', function(err, themenkreise) {
            if (err) throw err;

            res.status(200).send({ themenkreise: themenkreise });
        });
    });


    /*
     * Get TK
     */
    server.get('/api/tk/:id', function(req, res) {
        app.sql.query('SELECT * FROM themenkreise WHERE id = ?', [req.params.id], function(err, results) {
            if (err) throw err;

            if ( !results.length ) return res.sendStatus(404);

            res.status(200).send({ tk: results[0] });
        });
    });


    /*
     * Get Talks By ID
     */
    server.get('/api/tk/:tk_id/talks', function(req, res) {
        app.sql.query('SELECT talks.*, themenkreise.id as tk_id, themenkreise.title as tk_title, themenkreise.subtitle as tk_subtitle, speakers.id as speaker_id, speakers.firstname as speaker_firstname, speakers.lastname as speaker_lastname FROM talks JOIN themenkreise ON talks.tk_id = themenkreise.id JOIN speakers ON talks.speaker_id = speakers.id WHERE talks.tk_id = ?', [req.params.tk_id], function(err, talks) {
            if (err) throw err;

            if ( !talks.length ) return res.sendStatus(404);

            res.status(200).send({ talks: talks });
        });
    });


    /*
     * Get Talks
     */
    server.get('/api/talks', function(req, res) {
        app.sql.query('SELECT talks.*, themenkreise.id as tk_id, themenkreise.title as tk_title, themenkreise.subtitle as tk_subtitle, speakers.id as speaker_id, speakers.firstname as speaker_firstname, speakers.lastname as speaker_lastname FROM talks JOIN themenkreise ON talks.tk_id = themenkreise.id JOIN speakers ON talks.speaker_id = speakers.id', function(err, talks) {
            if (err) throw err;

            res.status(200).send({ talks: talks });
        });
    });


    /*
     * Get Talk
     * /
    server.get('/api/talk/:id', function(req, res) {
        app.sql.query('SELECT talks.*, themenkreise.id as tk_id, themenkreise.title as tk_title, themenkreise.subtitle as tk_subtitle, speakers.firstname as speaker_firstname, speakers.lastname as speaker_lastname FROM talks JOIN themenkreise ON talks.tk_id = themenkreise.id JOIN speakers ON talks.speaker_id = speakers.id WHERE talks.id = ?', [req.params.id], function(err, results) {
            if (err) throw err;

            if ( !results.length ) return res.sendStatus(404);

            res.status(200).send({ talks: results[0] });
        });
    });
    /**/


    /*
     * Get Speaker
     */
    server.get('/api/speakers', function(req, res) {
        app.sql.query('SELECT speakers.*, themenkreise.id as tk_id, themenkreise.title as tk_title, themenkreise.subtitle as tk_subtitle FROM speakers JOIN themenkreise ON speakers.tk_id = themenkreise.id', function(err, talks) {
            if (err) throw err;

            res.status(200).send({ speakers: speakers });
        });
    });


    /*
     * Get Speakers
     */
    server.get('/api/speaker/:id', function(req, res) {
        app.sql.query('SELECT speakers.*, themenkreise.id as tk_id, themenkreise.title as tk_title, themenkreise.subtitle as tk_subtitle FROM speakers JOIN themenkreise ON speakers.tk_id = themenkreise.id WHERE speakers.id = ?', [req.params.id], function(err, results) {
            if (err) throw err;

            if ( !results.length ) return res.sendStatus(404);

            res.status(200).send({ speaker: results[0] });
        });
    });




    return server;
}