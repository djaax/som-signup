require('pmx').init();

var express         = require('express'),
    bodyParser      = require('body-parser'),
    favicon         = require('serve-favicon'),
   	cookieParser	= require('cookie-parser'),
    session         = require('express-session'),
    methodOverride  = require('method-override'),
    _               = require('underscore'),
    winston         = require('winston'),
    mcapi           = require('mailchimp-api'),
    path            = require('path'),
    http            = require('http'),
    pmx             = require('pmx'),
    mysql           = require('mysql'),
    crypto          = require('crypto'),
    moment          = require('moment'),
    mcapi           = require('mailchimp-api'),
    multer          = require('multer'),
    slack           = require('slack-notify'),
    mandrill        = require('node-mandrill'),
    cors            = require('cors');
    
var app = module.exports = {};

/*
 * CONFIG
 */
app.dir         = __dirname;
app.env         = process.env;
app.config      = require(app.dir + '/config.js')(app.env.NODE_ENV);

app.mandrill    = mandrill(app.config.mandrill);
app.mailchimp   = new mcapi.Mailchimp(app.config.mailchimp);
app.logger      = winston;
app.sendgrid    = require('sendgrid')(app.config.sendgrid);
app.upload      = multer({ dest: 'uploads/' });
app.slack       = slack(app.config.slack);

app.utils = {
    md5: function(str, encoding) {
        return crypto
            .createHash('md5')
            .update(str)
            .digest(encoding || 'hex');
    }
};

/*
 * MYSQL
 */
(function mysqlConnect() {
    app.sql = mysql.createConnection(app.config.db);

    app.sql.connect(function(err) {
        if (err) {
            app.logger.error('MySQL connection failed', { err: err });
            return process.exit();
        }
        else {
            app.logger.info('MySQL connection establishing');
        }
        
        app.sql.on('error', function(err) {
            app.logger.error('MySQL error', { err: err });

            if (!err.fatal) {
                return;
            }
         
            if (err.code !== "PROTOCOL_CONNECTION_LOST") {
                throw err;
            }

            // Reconnect
            mysqlConnect();
        });
    });
}());
/**/

app.passport        = require('passport'),
    LocalStrategy   = require('passport-local').Strategy;

app.passport.use(new LocalStrategy({
    usernameField : 'email',
    passwordField : 'password',
    passReqToCallback : true
},function(req, username, password, done) {
    if ( username == app.config.admin.username && password == app.config.admin.pass ) {
        var user = {
            id: 0,
            type: 'admin'
        }

        return done(null, user);
    }

    // Check guests
    app.sql.query('SELECT id, firstname, lastname, email, password FROM guests WHERE email = ?', [username], function(err, results) {
        if (err) { return done(err); }

        // No Guest with this email
        if ( results.length == 0 ) {

            // Check Companies
            app.sql.query('SELECT * FROM companies WHERE email = ?', [username], function(err, results) {
                if (err) throw err;

                // Not Found
                if ( !results.length ) {
                    return done(null, false, { message: 'Incorrect username.' });
                } else if ( results[0].password !== app.utils.md5(password) ) {
                    // wrong password
                    return done(null, false, { message: 'Incorrect password.' });
                } else {
                    // All Good
                    var user = results[0];
                    user.type = 'company';
                    return done(null, user);
                }
            });
        } else if ( results[0].password !== app.utils.md5(password) ) {
            // wrong password
            return done(null, false, { message: 'Incorrect password.' });
        } else {
            // All Good
            var user = results[0];
            user.type = 'guest';
            return done(null, user);
        }
    });
}));
app.passport.serializeUser(function(user, done) {
    done(null, user);
});
app.passport.deserializeUser(function(user, done) {
    done(null, user);
});

app.auth = {
    check: function(req, res, type, next) {
        if ( !req.isAuthenticated() ) return res.sendStatus(401);
        if ( req.user.type !== type ) return res.sendStatus(401);
        next();
    },

    guest: function(req, res, next) {
        app.auth.check(req, res, 'guest', next);
    },

    company: function(req, res, next) {
        app.auth.check(req, res, 'company', next);
    },

    admin: function(req, res, next) {
        app.auth.check(req, res, 'admin', next);
    }
}


/*
 * LIBS
 */
// app.auth        = require(app.dir + '/libs/auth.js')(app);


/*
 * CONTROLLERS
 */
var GlobalCtrl = require(app.dir + '/controllers/global.js')(app);


/*
 * SERVER CONFIG
 */
app.express     = express();
app.server      = http.createServer(app.express);

/*
 * CORS
 ** /
var whitelist = ['http://localhost:8100'];
var corsOptions = {
    origin: function(origin, callback) {
        // if ( new RegExp('(.*\\.)?' + app.utils.escapeRegExp(app.config.endpoint)+ '$') )
        // if ( new RegExp('localhost:8100') );
            //callback(null, true);
        var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
            callback(null, originIsWhitelisted);
    },
    credentials: true
};
app.express.use(cors(corsOptions));
/**/

/*
 * CORS MIDDLEWARE
 ** /
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization');
    next();
}
app.express.use('/api', allowCrossDomain);
/**/

app.express.use(bodyParser.urlencoded({
    extended: true
}));
app.express.use(bodyParser.json());
app.express.use(cookieParser());
app.express.use(methodOverride());
app.express.use(favicon(app.dir + '/public/style/img/favicon.png'));
var sessionMiddleware = session({
    //store: new RedisStore({ host: 'localhost', port: 6379, client: app.redis }),
    secret: app.config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        path: '/',
        maxAge: null
    }
});
app.express.use(sessionMiddleware);

app.express.use(app.passport.initialize());
app.express.use(app.passport.session());

/*
 * ROUTING
 */
app.express.use(GlobalCtrl);

// Serve static files.
app.express.use(express.static(path.join(app.dir, 'public')));

/*
 * SERVER STARTUP
 *
 * SSL settings via nginx reverse proxy, see /etc/nginx/conf.d/
 */
app.server.listen(app.config.port, function() {
	app.logger.info('Server listening on port ' + app.config.port);
});