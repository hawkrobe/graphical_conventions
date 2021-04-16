//   Copyright (c) 2012 Sven "FuzzYspo0N" Bergström,
//                   2013 Robert XD Hawkins

//     written by : http://underscorediscovery.com
//     written for : http://buildnewgames.com/real-time-multiplayer/

//     modified for collective behavior experiments on Amazon Mechanical Turk

//     MIT Licensed.

// A window global for our game root variable.
var globalGame = {};

// A window global for our id, which we can use to look ourselves up
var my_id = null;
var my_role = null;

// Keeps track of whether player is paying attention...
var incorrect;
var dragging;
var waiting;

//test: let's try a variable selecting, for when the listener selects an object
// we don't need the dragging.
var selecting;

// variable to store whether an object has just been clicked
var objClicked = false;

// variable to store whether the sketcher has clicked the submit button
var submitted = false;


/*
 Note: If you add some new variable to your game that must be shared
 across server and client, add it both here and the server_send_update
 function in game.core.js to make sure it syncs

 Explanation: This function is at the center of the problem of
 networking -- everybody has different INSTANCES of the game. The
 server has its own, and both players have theirs too. This can get
 confusing because the server will update a variable, and the variable
 of the same name won't change in the clients (because they have a
 different instance of it). To make sure everybody's on the same page,
 the server regularly sends news about its variables to the clients so
 that they can update their variables to reflect changes.
 */

var client_onserverupdate_received = function(data){
  // Update client versions of variables with data received from
  // server_send_update function in game.core.js
  //data refers to server information
  if(data.players) {
    _.map(_.zip(data.players, globalGame.players),function(z){
      z[1].id = z[0].id;
    });
  }

  // If your objects are out-of-date (i.e. if there's a new round), set up
  // machinery to draw them
  if (globalGame.roundNum != data.roundNum) {
    var alreadyLoaded = 0;
    $('#occluder').show();
    globalGame.drawingAllowed = false;
    //console.log("data.objects:" + data.objects);
    globalGame.objects = _.map(data.objects, function(obj) {
      // Extract the coordinates matching your role
      var customCoords = globalGame.my_role == "sketcher" ? obj.speakerCoords : obj.listenerCoords;
      // remove the speakerCoords and listenerCoords properties
      var customObj = _.chain(obj)
	    .omit('speakerCoords', 'listenerCoords')
	    .extend(obj, {trueX : customCoords.trueX, trueY : customCoords.trueY,
			  gridX : customCoords.gridX, gridY : customCoords.gridY,
			  box : customCoords.box})
	    .value();

      var imgObj = new Image(); //initialize object as an image (from HTML5)
      imgObj.src = customObj.url; // tell client where to find it

      imgObj.onload = function(){ // Draw image as soon as it loads (this is a callback)
        globalGame.ctx.drawImage(imgObj, parseInt(customObj.trueX), parseInt(customObj.trueY),
				  customObj.width, customObj.height);
          if (globalGame.my_role === globalGame.playerRoleNames.role1) {
            globalGame.ctx.clearRect(0, 0, globalGame.viewport.width, globalGame.viewport.height);
            drawGrid(globalGame);
            drawObjects(globalGame, globalGame.get_player(globalGame.my_id));
            highlightCell(globalGame, '#ffffff', function(x) {return x.target_status == 'target';});
          } else {
            globalGame.ctx.clearRect(0, 0, globalGame.viewport.width, globalGame.viewport.height);
            drawGrid(globalGame);
            drawObjects(globalGame, globalGame.get_player(globalGame.my_id));
          }

          alreadyLoaded += 1

          if (alreadyLoaded == globalGame.setSize) {
              setTimeout(function() {
              $('#occluder').hide();
              drawGrid(globalGame);
              drawObjects(globalGame, globalGame.get_player(globalGame.my_id));
              globalGame.drawingAllowed = true;
            },750);
          }
      };
      return _.extend(customObj, {img: imgObj});
    });
  };

  // Get rid of "waiting" screen and allow drawing if there are multiple players
  if(data.players.length > 1) {
    $('#messages').empty();
    drawScreen(globalGame, globalGame.get_player(globalGame.my_id));
    $('#occluder').show();
    colorBorder(globalGame);
  }

  globalGame.game_started = data.gs;
  globalGame.players_threshold = data.pt;
  globalGame.player_count = data.pc;
  globalGame.roundNum = data.roundNum;

  // update data object on first round, don't overwrite (FIXME)
  if(!_.has(globalGame, 'data')) {
    globalGame.data = data.dataObj;
  }

  // Draw all this new stuff
  drawScreen(globalGame, globalGame.get_player(globalGame.my_id));
};

// This is where clients parse socket.io messages from the server. If
// you want to add another event (labeled 'x', say), just add another
// case here, then call

//          this.instance.player_host.send("s.x. <data>")

// The corresponding function where the server parses messages from
// clients, look for "server_onMessage" in game.server.js.

var client_onMessage = function(data) {

  var commands = data.split('.');
  var command = commands[0];
  var subcommand = commands[1] || null;
  var commanddata = commands[2] || null;

  switch(command) {
  case 's': //server message
    switch(subcommand) {
    case 'end' :
      // Redirect to exit survey
      ondisconnect();
      console.log("received end message...");
      $('#sketchpad').hide();
      break;

    case 'feedback' :
      console.log("calling feedback");
      // Prevent them from sending messages b/w trials
      $('#chatbox').attr("disabled", "disabled");
      var clickedObjName = commanddata;
      objClicked = true; // set clicked obj toggle variable to true
      player = globalGame.get_player(globalGame.my_id); // change this
      globalGame.viewport.removeEventListener("click", responseListener, false); // added - moved

      $element.find('.progress-bar').finish();
      //console.log("finishing progress bar");

      var timeleft = commands[3]; // commands[3] is what we used for player role ???
      if (timeleft < 0) { // bad style but works right now
        timeleft = 0;
      }

      // update local score
      var target = _.filter(globalGame.objects, function(x){
	       return x.target_status == 'target';
      })[0];
      var scoreDiff = target.subordinate == clickedObjName ? 1 : 0;
      var earnedCents = 0;
      if (scoreDiff == 1) {
        globalGame.data.subject_information.score += 3.00;
        globalGame.data.subject_information.bonus_score += parseFloat((timeleft / 30).toFixed(2));
        earnedCents = (3.00 + parseFloat((timeleft / 30).toFixed(2))).toFixed(2);
      }
      // draw feedback
      if (globalGame.my_role === globalGame.playerRoleNames.role1) {
	       drawSketcherFeedback(globalGame, scoreDiff, clickedObjName, earnedCents);
      } else {
	       drawViewerFeedback(globalGame, scoreDiff, clickedObjName, earnedCents);
      }
      break;

    case 'alert' : // Not in database, so you can't play...
      alert('You did not enter an ID');
      window.location.replace('http://nodejs.org'); break;

    case 'join' : //join a game requested
      $('#startbutton').hide();
      $('#confirmbutton').hide();
      var num_players = commanddata;
      client_onjoingame(num_players, commands[3]); break;

    case 'add_player' : // New player joined... Need to add them to our list.
      clearTimeout(globalGame.timeoutID);
      if(hidden === 'hidden') {
        flashTitle("GO!");
      }
      globalGame.get_player(globalGame.my_id).message = ('');
      drawScreen(globalGame, globalGame.get_player(globalGame.my_id));
      $('#occluder').show();
      $('#startbutton').show();

      $('#startbutton').click(function start() {
        $('#startbutton').hide();
        globalGame.socket.send('startGame');
      });

      globalGame.players.push({id: commanddata,
                 player: new game_player(globalGame)});

      break;
    }
  }
};

var client_addnewround = function(game) {
  $('#roundnumber').append(game.roundNum);
  document.getElementById('sketchpad').focus();
};

var customSetup = function(game) {
  game.sketchpad = new Sketchpad();

  $(document).ready(function() { // added back submit button
    $("#submitbutton").click(function(){
      if (globalGame.currStrokeNum > 0) { // only allow submit button to be pressed if at least one stroke made
        var finished = ['doneDrawing',1];
        globalGame.socket.send(finished.join('.'));
        $('#feedback').html("");
      } else {
        if (!globalGame.useSubmitButton || !globalGame.doneDrawing) {
          $('#feedback').html("Please make your sketch.");
        }
      }
    });

    // get workerId, etc. from URL
    var urlParams;
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
    urlParams[decode(match[1])] = decode(match[2]);
    globalGame.workerId = urlParams.workerId;
    globalGame.assignmentId = urlParams.assignmentId;
    globalGame.hitId = urlParams.hitId;

  });

  game.socket.on('mutualDoneDrawing', function(role) {
    globalGame.doneDrawing = true;
    globalGame.drawingAllowed = false;
    submitted = true;
    if (globalGame.my_role === globalGame.playerRoleNames.role1) {
      $('#feedback').html(" ");
      setTimeout(function(){$('#turnIndicator').html("Your partner's turn to guess the target!");},globalGame.feedbackDelay);
    } else if (globalGame.my_role === globalGame.playerRoleNames.role2) {
      $("#loading").fadeOut('fast');
      setTimeout(function(){$('#turnIndicator').html('Your turn: Select the target!');},globalGame.feedbackDelay);
    }
  });

  // Set up new round on client's browsers after submit round button is pressed.
  // This means clear the canvas, update round number, and update score on screen
  game.socket.on('newRoundUpdate', function(data){
    // Reset sketchpad each round
    project.activeLayer.removeChildren();
    // reset drawing stuff
    globalGame.doneDrawing = false;
    game.strokeMade = false;
    globalGame.path = [];
    submitted = false;

    // reset clicked obj flag
    objClicked = false;
    if(globalGame.my_role === globalGame.playerRoleNames.role2) {
      globalGame.viewport.addEventListener("click", responseListener, false); // added
      if (globalGame.useSubmitButton) {
        $("#loading").show();
        $("#loading-message").html("The Sketcher is still drawing...");
      }
    }
    // Reset stroke counter
    globalGame.currStrokeNum = 0;
    drawGrid(globalGame);
    drawObjects(globalGame, player);

    // clear feedback blurb
    $('#feedback').html(" ");
    $('#scoreupdate').html(" ");
    $('#turnIndicator').html(" ");
    // set up progress bar
    $('.progress-bar').attr('aria-valuemax',globalGame.timeLimit);
    $('.progress').show();

    // Update display
    var score = game.data.subject_information.score;
    //console.log("SCORE: " + score);
    var bonus_score = game.data.subject_information.bonus_score;
    //console.log("BONUS: " + bonus_score);
    var displaytotal = (((parseFloat(score) + parseFloat(bonus_score))/ 100.0).toFixed(2));
    // console.log("TOTAL: " + displaytotal); // added
    if(game.roundNum + 2 > game.numRounds) {
      $('#roundnumber').empty();
      $('#sketchpad').hide();
      $('#instructs').html('Thanks for participating in our experiment! ' +
        "Before you submit your HIT, we'd like to ask you a few questions.");
      $('#roundnumber').empty()
        .append("Round\n" + (game.roundNum + 1) + " of " + game.numRounds);
    } else {
      $('#roundnumber').empty()
        .append("Round\n" + (game.roundNum + 2) + " of " + game.numRounds);
    }
    $('#score').empty().append(score / 3 + ' of ' + (game.roundNum + 1) + ' correct for a bonus of $'
			       + displaytotal);
  });


  game.socket.on('phaseChange', function(data){
    // pop-ups in between phases
    var afterPreRound = globalGame.setSize * 2;
    var beforePostRound = globalGame.numRounds - globalGame.setSize * 2;
    $("#main").hide();
    $("#header").hide();
    $("#dimScreen").show();

    if (game.roundNum == afterPreRound - 1) {
      $("#after_pre").show(); //or $("#before_post").show();
      setupOverlay();

    } else {
      $("#before_post").show(); //or $("#before_post").show();
      setupOverlay();
    }

  });


  game.socket.on('stroke', function(jsonData) {
    // first, allow listener to respond
    game.messageSent = true;
    game.strokeMade = true;
    // draw it
    var path = new Path();
    path.importJSON(jsonData);
    //var sketchShowsUpTime = Date.now();
    //console.log("sketchshowsuptime: " + sketchShowsUpTime);
  });

 // new progress bar function
  game.socket.on('updateTimer', function(timeleft) {
      timetotal = globalGame.timeLimit;
      $element = $('.progress');
      var progressBarWidth = timeleft * $element.width()/ timetotal;
      var totalBarWidth = $element.width();
      var centsleft = (timeleft / 30 + 3).toFixed(2);
      $element.find('.progress-bar').attr("aria-valuenow", centsleft).text(centsleft)
      $element.find('.progress-bar').finish();
      $element.find('.progress-bar').animate({ width: progressBarWidth }, timeleft == timetotal ? 0 : 1000, "linear");
      $('.progress-bar').attr('aria-valuemax',globalGame.timeLimit);
      $('.progress').show();
      if (globalGame.useSubmitButton) {
        $("#loading-message").html("The Sketcher is still drawing...");
      }
  });

  game.socket.on('timeOut', function(timeleft) {
    globalGame.doneDrawing = true;
    globalGame.drawingAllowed = false;
    submitted = true;
    if (globalGame.my_role === globalGame.playerRoleNames.role1 && !objClicked) {
      $('#feedback').html(" ");
      $('#scoreupdate').html(" ");
      setTimeout(function(){$('#turnIndicator').html("Time's up! Now your partner has to guess which object you were drawing!");},globalGame.feedbackDelay);
    } else if (globalGame.my_role === globalGame.playerRoleNames.role2 && !objClicked) {
      setTimeout(function(){$('#turnIndicator').html("Time's up! Make a selection!");},globalGame.feedbackDelay);
      if (globalGame.useSubmitButton) {
        $("#loading").fadeOut('fast');
      }
    }
  });

  game.socket.on('readyToContinue', function(data){
    $('#dimScreen').hide();
    $("#after_pre").hide();
    $("#before_post").hide();
    $('#main').show();
    $('#header').show();
  });
};


var client_onjoingame = function(num_players, role) {

  if (globalGame.setSize == 4) {
    $("#viewport").css({"height": "25vh","width": "100vh"});
    $("#occluder").css({"height": "25vh","width": "100vh"});
    $("#confirmbutton").css({"top": "95%"});
    $('#roundnumber').html("Round 1 of 40");
  } else {
    $("#viewport").css({"height": "20vh","width": "120vh"});
    $("#occluder").css({"height": "20vh","width": "120vh"});
    $("#confirmbutton").css({"top": "90%"});
    $('#roundnumber').html("Round 1 of 48");
  }
  // set role locally
  globalGame.my_role = role;

  globalGame.get_player(globalGame.my_id).role = globalGame.my_role;

  // this.browser = BrowserDetect.browser;
  // this.version = BrowserDetect.version;
  // this.OpSys = BrowserDetect.OS;

  _.map(_.range(num_players - 1), function(i){
    globalGame.players.unshift({id: null, player: new game_player(globalGame)});
  });

  // Update w/ role
  $('#roleLabel').append(role + '.');
  if (role === globalGame.playerRoleNames.role1) {
    txt = "target";
    $('#instructs').html("<p>You have 30 seconds to make a sketch of the target (white) so that your partner can tell which it is. You will receive </p>" +
      "<p> a bonus ONLY if the Viewer selects the correct object (plus small additional speed bonus). Draw the object as you see it, and DO NOT include letters, arrows, or surrounding context. Please do not resize browser window or change zoom during the game. </p>");
      if (globalGame.useSubmitButton) {
        $("#submitbutton").show();
      }
  } else if (role === globalGame.playerRoleNames.role2) {

    $('#instructs').html("<p>Your partner has 30 seconds to draw one of these four objects. When you are sure which it is, click on the object </p>" +
      "<p> you think they're drawing. If you are correct, you will both receive a bonus (plus small additional speed bonus).</p>" +
      "<p> Please do not resize browser window or change zoom during the game.</p>");
    if (globalGame.useSubmitButton) {
      $("#loading").show();
      $("#loading-message").html("");
    }
  }

  if(num_players == 1) {
    // Set timeout only for first player...
    this.timeoutID = setTimeout(function() {
      if(_.size(this.urlParams) == 4) {
  	this.submitted = true;
  	window.opener.turk.submit(this.data, true);
    // console.log("submitted the following :");
  	// console.log(this.data);
  	window.close();
      } else {
  	// console.log("would have submitted the following :");
  	// console.log(this.data);
      }
    }, 1000 * 60 * 15);
    globalGame.get_player(globalGame.my_id).message = ('Waiting for another player...\nPlease do not refresh the page!\n If wait exceeds 5 minutes, we recommend returning the HIT and trying again later.');
  }

  // set mouse-tracking event handler
  if(role === globalGame.playerRoleNames.role2) {
    // added and put the rest inside click function
    // send packet to server on button click
    $('#confirmbutton').click(function start() {
      if(globalGame.packet) {
        if (globalGame.strokeMade || globalGame.doneDrawing) { // change
          if (!globalGame.useSubmitButton || submitted) {
            $('#confirmbutton').hide();
            globalGame.socket.send(globalGame.packet.join('.'));
          }
        }
      }
    });
    globalGame.viewport.addEventListener("click", responseListener, false);
    globalGame.get_player(globalGame.my_id).message = ('Waiting for the sketcher to click begin.\nPlease do not refresh the page!\n ');
    drawScreen(globalGame, globalGame.get_player(globalGame.my_id));
  } else {
    globalGame.sketchpad.setupTool();
  }

};

var setupOverlay = function() { // added transition pop-up
  //console.log("setupOverlay being called");
  if (globalGame.get_player(globalGame.my_id).role == globalGame.playerRoleNames.role1) {
    //console.log("i am the sketcher");
    $('#after_pre_button').click(function next() {
      globalGame.socket.send('sketcherReady');
      $('#after_pre_text').text("Waiting for Viewer to click 'next'...");
    });
    $('#before_post_button').click(function next() {
      globalGame.socket.send('sketcherReady');
      $('#before_post_text').text("Waiting for Viewer to click 'next'...");
    });
  } else {
    $('#after_pre_button').click(function next() {
      globalGame.socket.send('viewerReady');
      $('#after_pre_text').text("Waiting for Sketcher to click 'next'...");
    });
    $('#before_post_button').click(function next() {
      globalGame.socket.send('viewerReady');
      $('#before_post_text').text("Waiting for Sketcher to click 'next'...");
    });
  }
};


/*
 MOUSE EVENT LISTENERS
 */
function responseListener(evt) {
    var bRect = globalGame.viewport.getBoundingClientRect();
    var mouseX = (evt.clientX - bRect.left)*(globalGame.viewport.width/bRect.width);
    var mouseY = (evt.clientY - bRect.top)*(globalGame.viewport.height/bRect.height);
    // only allow to respond after message has been sent
    //if ((globalGame.messageSent) || (globalGame.doneDrawing)){
	// find which shape was clicked
	_.forEach(globalGame.objects, function(obj) {
	    if (hitTest(obj, mouseX, mouseY)) {
          $('#confirmbutton').show();
		      //globalGame.messageSent = false;
          var player = globalGame.get_player(globalGame.my_id)
          preFeedback(globalGame, obj.subordinate, player);
          drawGrid(globalGame);
          // Send packet about trial to server
          var dataURL = document.getElementById('sketchpad').toDataURL();
          dataURL = dataURL.replace('data:image/png;base64,','');
          globalGame.packet = [
            "clickedObj",
            obj.subordinate,
  		      dataURL,
  		      globalGame.objects[0]['pose'],
  		      globalGame.objects[0]['condition'],
  		      globalGame.objects[0]['phase'],
  		      globalGame.objects[0]['repetition'],
            globalGame.data.subject_information.score,
            (globalGame.data.subject_information.bonus_score.toString()).replace(/\./g,'~~~'),
            globalGame.objects[0]['subset']
          ];
      }
    });
  // }
  return false;
};


function getObjectLocs(objects) {
  return _.flatten(_.map(objects, function(object) {
    return [object.subordinate,
      object.speakerCoords.gridX,
      object.listenerCoords.gridX];
  }));
}

function getIntendedTargetName(objects) {
  return _.filter(objects, function(x){
    return x.target_status == 'target';
  })[0]['subordinate'];
}

function hitTest(shape,mx,my) {
  var dx = mx - shape.trueX;
  var dy = my - shape.trueY;
  return (0 < dx) && (dx < shape.width) && (0 < dy) && (dy < shape.height);
}
