var express = require('express'),
	app = express(),
	server = require('http').Server(app),
	secret = require('./config'),
	Twit = require('twit'),
	bodyParser = require('body-parser'),
	sentiment = require('sentiment'),
	moment = require('moment'),
	usage = require('usage'),
	mysql = require('mysql'),
	host = 'localhost',
	port = 3000;

// Create mysql connection
var con = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DB
});

con.connect(function(err){
  if(err){
    console.log('Error connecting to Db');
    return;
  }
  console.log('Connection established');
});

con.query('CREATE TABLE IF NOT EXISTS tweets (tweetID INT, text VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_general_ci, profile VARCHAR(255), created DATETIME)', function(err, result) {
	if(err) throw err;
});

server.listen(port);

var pid = process.pid;

app.set('views', __dirname + '/views');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);

app.use(express.static(__dirname + '/public'));

var T = new Twit({
    consumer_key: process.env.CONSUMER_KEY
  , consumer_secret: process.env.CONSUMER_SECRET
  , access_token: process.env.ACCESS_TOKEN
  , access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

var stream;
var queries;
var dateTime;

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.get('/', function (req, res) {
	res.render("index");
});

app.get('/update', function (req, res) {
	var tweets;
	// Last 10 tweets
	con.query('SELECT * FROM tweets ORDER BY created DESC LIMIT 10', function(err, rows) {
	  if(err) throw err;
	  tweets = rows;
	});
	
	var tSentiment = {'positive': 0, 'negative': 0, 'netural': 0};
	con.query("SELECT * FROM tweets WHERE created > '" + dateTime + "'", function(err, rows) {
	  	if(err) throw err;
    	for(var i=0; i < rows.length; i++) {
    		var s = sentiment(rows[i].text);
    		if (s.score < 0) {
				tSentiment.negative++;
			}
			if (s.score > 0) {
				tSentiment.positive++;
			}
			if (s.score == 0) {
				tSentiment.netural++;
			}
    	}
    	res.send({'tweets': tweets, 'sentiment': tSentiment});
	});

});

app.get('/status', function (req, res) {
                var statusCode;
                usage.lookup(pid, function(err, result) { // result.cpu is the average cpu in %
                        if(result.cpu > 70) {
                                // server status is bad!
                                statusCode = 500;
                        } else {
                                // server status is good, keep them traffic coming!
                                statusCode = 200;
                        }
                    res.status(statusCode);
                    res.send();
                });
});

app.post('/query', function (req, res) {
	queries = req.body.query.split(",");

	con.query('truncate tweets', function(err, res){
		if(err) throw err;
	});

	dateTime = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");

	if (stream != null) {
		stream.stop();
	}

	stream = T.stream('statuses/filter', { track: queries });
	
	stream.on('tweet', function (tweet) {
		var doc = {
			tweetID: tweet.id,
			text: tweet.text,
			profile: tweet.user.profile_image_url_https,
			created: moment(new Date()).format("YYYY-MM-DD HH:mm:ss")
		};

		con.query('INSERT INTO tweets SET ?', doc, function(err, res){
		  if(err) throw err;
		});

	});

	res.end();
});

app.get('/stop', function (req, res) {
	stream.stop();
	res.end();
});

console.log('App listening at http://%s:%s', host, port);