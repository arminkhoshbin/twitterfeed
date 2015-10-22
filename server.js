var express = require('express'),
	app = express(),
	server = require('http').Server(app),
	secret = require('./config'),
	Twit = require('twit'),
	bodyParser = require('body-parser'),
	io = require('socket.io')(server),
	sentiment = require('sentiment'),
	Datastore = require('nedb'),
	moment = require('moment'),
	usage = require('usage'),
	host = 'localhost',
	port = 80;

// Persistance datastore with manual loading
var db = new Datastore({ filename: 'Datastore/' + moment().format('YYYYMMDDHHmmss_') + 'db.json' });
db.loadDatabase(function (err) {
	if(err) console.log(err);
});

server.listen(port);

var pid = process.pid;

io.on('connection', function (socket) {
	console.log('Socket Established');

	socket.on('refresh', function(data) {
		var tSentiment = {'positive': 0, 'negative': 0, 'netural': 0};
    db.find({}, function (err, docs) {
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
    	socket.emit('sentiment', tSentiment);
		});
  });

});

app.set('views', __dirname + '/views');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);

app.use(express.static(__dirname + '/public'));

var T = new Twit({
    consumer_key: secret.Twitter.consumer_key
  , consumer_secret: secret.Twitter.consumer_secret
  , access_token: secret.Twitter.access_token
  , access_token_secret: secret.Twitter.access_token_secret
});

var stream;

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.get('/', function (req, res) {
	res.render("index");
});

app.get('/status', function (req, res) {
                var statusCode;
                var options = { keepHistory: true };
                usage.lookup(pid, options, function(err, result) { // result.cpu is the current cpu in %
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
	var queries = req.body.query.split(",");
	if (stream != null) {
		stream.stop();
		stream = T.stream('statuses/filter', { track: queries });
	} else {
		stream = T.stream('statuses/filter', { track: queries });
	}
	stream.on('tweet', function (tweet) {
		var doc = {
			tweetID: tweet.id,
			text: tweet.text,
			created: new Date(),
			query: req.body.query,
		};

		db.insert(doc, function (err) {
			if(err) console.log(err);
		});
		
		io.sockets.emit('newTweet', tweet);

		var tSentiment = {'positive': 0, 'negative': 0, 'netural': 0};
    db.find({query: req.body.query }, function (err, docs) {
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
    	io.sockets.emit('sentiment', tSentiment);
		});

	});

	res.end();
});

console.log('App listening at http://%s:%s', host, port);