var express = require('express'),
	app = express(),
	server = require('http').Server(app),
	secret = require('./config'),
	Twit = require('twit'),
	bodyParser = require('body-parser'),
	sentiment = require('sentiment'),
	Datastore = require('nedb'),
	moment = require('moment'),
	usage = require('usage'),
	host = 'localhost',
	port = 3000;

// Persistance datastore with manual loading
var db = new Datastore({ filename: 'Datastore/' + moment().format('YYYYMMDDHHmmss_') + 'db.json' });
db.loadDatabase(function (err) {
	if(err) console.log(err);
});

server.listen(port);

var pid = process.pid;

app.set('views', __dirname + '/views');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);

app.use(express.static(__dirname + '/public'));

var T = new Twit({
    consumer_key: process.env.consumer_key
  , consumer_secret: process.env.consumer_secret
  , access_token: process.env.access_token
  , access_token_secret: process.env.access_token_secret
});

var stream;
var queries;

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
	db.find({}).sort({ created: -1 }).limit(10).exec(function (err, docs) {
	  tweets = docs;
	});
	
	var tSentiment = {'positive': 0, 'negative': 0, 'netural': 0};
	db.find({query: { $in: queries }}, function (err, docs) {
    	if(err) console.log(err);
    	for(var i=0; i < docs.length; i++) {
    		var s = sentiment(docs[i].text);
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

	if (stream != null) {
		stream.stop();
	}

	stream = T.stream('statuses/filter', { track: queries });
	
	stream.on('tweet', function (tweet) {
		var doc = {
			tweetID: tweet.id,
			text: tweet.text,
			profile: tweet.user.profile_image_url_https,
			created: new Date(),
			query: queries,
		};

		db.insert(doc, function (err) {
			if(err) console.log(err);
		});

	});

	res.end();
});

app.get('/stop', function (req, res) {
	stream.stop();
	res.end();
});

console.log('App listening at http://%s:%s', host, port);