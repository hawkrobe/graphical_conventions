global.__base = __dirname + '/';

var
    use_https     = true,
    argv          = require('minimist')(process.argv.slice(2)),
    https         = require('https'),
    fs            = require('fs'),
    app           = require('express')(),
    _             = require('lodash'),
    parser        = require('xmldom').DOMParser,
    XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest,
    sendPostRequest = require('request').post;


var num_trials = 64; // why is the number of trials 64, instead of 10 as defined in setup.js
var gameport;
if(argv.gameport) {
  gameport = argv.gameport;
  console.log('using port ' + gameport);
} else {
  gameport = 8882;
  console.log('no gameport specified: using 8882\nUse the --gameport flag to change');
}

try {
  var privateKey  = fs.readFileSync('/etc/letsencrypt/live/cogtoolslab.org/privkey.pem'), 
      certificate = fs.readFileSync('/etc/letsencrypt/live/cogtoolslab.org/cert.pem'),
      intermed    = fs.readFileSync('/etc/letsencrypt/live/cogtoolslab.org/chain.pem')
      options     = {key: privateKey, cert: certificate, ca: intermed},
      server      = require('https').createServer(options,app).listen(gameport),
      io          = require('socket.io')(server);
} catch (err) {
  console.log("cannot find SSL certificates; falling back to http");
  var server      = app.listen(gameport),
      io          = require('socket.io')(server);
}

app.get('/*', (req, res) => {
  serveFile(req, res);
});

io.on('connection', function (socket) {

  
  socket.on('splineData', function(data) {// write data to db upon getting current data
    // console.log(JSON.stringify(_.pick(data, ['dbname','colname','iterationName','gameID','trialNum','category','target']), null, 3));
    // Increment games list in mongo here
    writeDataToMongo(data);
  });

  socket.on('getStim', function(data) {
    sendStim(socket, data);
  });

  
  socket.emit('onConnected', {  // upon getting connected,
    id: UUID(), // assign id
    num_trials: num_trials
  });

});

var serveFile = function(req, res) {
  var fileName = req.params[0];
  //console.log('\t :: Express :: file requested: ' + fileName);
  return res.sendFile(fileName, {root: __dirname});
};

var UUID = function() { // this function generates generate gameID
  var baseName = (Math.floor(Math.random() * 10) + '' +
        Math.floor(Math.random() * 10) + '' +
        Math.floor(Math.random() * 10) + '' +
        Math.floor(Math.random() * 10));
  var template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  var id = baseName + '-' + template.replace(/[xy]/g, function(c) { // assign id name 
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
  return id;
};

function sendStim(socket, data) {
    // console.log("I AM ABOUT TO SEND REQUEST TO DATABASE"); // prints to console
  console.log('sending request to patching collection')
  sendPostRequest('http://localhost:6001/db/getstims', {
    json: {
      dbname: 'stimuli',
      colname: 'graphical_conventions_semantic_mapping',
      numTrials: 1,
      gameid: data.gameID
    }
  }, (error, res, body) => {
    if (!error && res.statusCode === 200) {
      socket.emit('stimulus', body);
      console.log('sending stim: ', _.pick(body, ['gameID','trialNum','condition','repetition','shufflerInd']));
    } else {
      console.log(`error getting stims: ${error} ${body}`);
      console.log(`falling back to local stimList`);
      socket.emit('stimulus', _.sample(require('./data/example.json')));
    }
  });
} // 

var writeDataToMongo = function(data) {
  sendPostRequest(
    'http://localhost:6001/db/insert',
    { json: data },
    (error, res, body) => {
      if (!error && res.statusCode === 200) {
        console.log(`sent data to store`);
      } else {
	      console.log(`error sending data to store: ${error} ${body}`);
      }
    }
  );
};
