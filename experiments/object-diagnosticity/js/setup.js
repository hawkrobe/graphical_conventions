var score = 0;
var thisExp = { //  basic information for the  exp for a given participant
  type: 'object-mapping', // experiment name
  iterationName: 'testing', // current iteration of the experiment
  numTrials: 16 // total number of trials in this experiment
};

function sendData() {
  console.log('sending data to mturk');
  jsPsych.turk.submitToTurk({ 'score': score });
}

// function makeTrialList(main_on_start, main_on_finish) {
//   // shuffle order of each class of objects
//   var stimList = _.mapValues(_.cloneDeep(_stimList), (v) =>  _.shuffle(v));
//   var blocks = [0, 1, 2, 3];
//   var contexts = ['diningA', 'diningB', 'waitingA', 'waitingB'];
//   var trialList = [];

//   // loop through blocks of different contexts
//   _.forEach(blocks, function(blockID, i) {
//     _.forEach(_.shuffle(contexts), function(contextID, j) {
//       trialList.push({
//         type: thisExp.type,        
//         trialNum: j + blocks.length * i,
// 	block : blockID,
//         context: contextID,
// 	contextURLs: stimList[contextID],
//         targetURL: stimList[contextID][blockID],
//         numTrials: thisExp.numTrials, 
//         on_finish: main_on_finish,
//         on_start: main_on_start
//       });
//     });
//   });
//   return trialList;
// }

function setupExp() {

  var socket = io.connect();
  
  socket.on('onConnected', function (d) { // d is the entire session experiment
    // These are flags to control which trial types are included in the experiment
    const includeIntro = true;
    const includeTask = true;
    const includeGoodbye = true;

    var id = d.id; 

    var instructionsHTML = {};
    instructionsHTML.str1 = "<p> Welcome!</p><p> In this HIT you will play a fun game where \
    you will look at various objects and tell us what makes them look different from other ones. \
    Your total time commitment is expected to be \
    approximately 6 minutes, including the time it takes to read these \
    instructions. For your participation in this study, you will be paid $1.20.</p>"

    instructionsHTML.str2 = "<p> The reason we are asking you about these objects is because \
    we previously used them in a Pictionary game in which one person (the sketcher)  \
    tried to draw one of them, so that someone else (the viewer) could tell which one \
    out a set of four objects they were trying to draw. \
    We would like to understand what parts of these objects stand out the most \
    - in other words, what makes them look the <b>most different</b> from other ones. </p> \
    <img src= 'assets/pictionary_graphic.png' id= 'smallImg'></img>\ "

    instructionsHTML.str3 = "<p> Here's how the game will work. On each trial, \
    you will be shown two objects side by side: on the left is the <b>target</b> and on the right \
    is the <b>foil</b>. Your goal is to paint over the parts of the target that look \
    the <b>most different</b> from the foil. For example, here you might paint over the wheels.</p> \
    <img src= 'assets/mapping_demo_frame2.png' id= 'largeImg'></img>"

    instructionsHTML.str4 = "<p> It is okay to paint over more than one part \
    (e.g., both the armrests and the backrest), but please also try to be selective \
    and precise when deciding where to paint. We suggest prioritizing one or two \
    parts of the target that make it look <b>most different</b> from the foil, rather than \
    painting many parts that only somewhat distinguish the target from the foil. Also, \
    please do not paint over <b>empty space</b> to indicate that something is <b>missing</b> from the target: \
    only paint parts that exist in the target. </p> \
    <img src= 'assets/mapping_demo_frame2.png' id= 'largeImg'></img>"

    instructionsHTML.str5 = "<p>Once you are done painting an object, click <b>continue</b> to move\
    onto the next pair of objects.</p> <p>That's it! Your remaining\
    time commitment is expected to be around 4 minutes. Please pay\
    attention and try to do your best. When you are ready, click Next\
    to begin the HIT. </p>";



    consentHTML = {
      'str1' : ["<u><p id='legal'>Consent to Participate</p></u>",
      "<p id='legal'>By completing this HIT, you are participating in a \
      study being performed by cognitive scientists in the UC San Diego \
      Department of Psychology. The purpose of this research is to find out\
      how people understand visual information. \
      You must be at least 18 years old to participate. There are neither\
      specific benefits nor anticipated risks associated with participation\
      in this study. Your participation in this study is completely voluntary\
      and you can withdraw at any time by simply exiting the study. You may \
      decline to answer any or all of the following questions. Choosing not \
      to participate or withdrawing will result in no penalty. Your anonymity \
      is assured; the researchers who have requested your participation will \
      not receive any personal information about you, and any information you \
      provide will not be shared in association with any personally identifying \
      information.</p>"].join(' '),
      'str2' : ["<u><p id='legal'>Consent to Participate</p></u>",
      "<p> If you have questions about this research, please contact the \
      researchers by sending an email to \
      <b><a href='mailto://cogtoolslab.requester@gmail.com'>cogtoolslab.requester@gmail.com</a></b>. \
      These researchers will do their best to communicate with you in a timely, \
      professional, and courteous manner. If you have questions regarding your rights \
      as a research subject, or if problems arise which you do not feel you can \
      discuss with the researchers, please contact the UC San Diego Institutional \
      Review Board.</p><p>Click Next to continue participating in this HIT.</p>"].join(' ')
    }    



      
    // --------------------       INTRODUCTORY INSTRUCTIONS  --------------------
    var introMsg = { //Into is the object going to be inserted into trials array
      type: 'instructions',
      pages: [
        instructionsHTML.str1, // each string corresponds to ONE page of instructions
        consentHTML.str1,
        consentHTML.str2,
        instructionsHTML.str2,
        instructionsHTML.str3,
        instructionsHTML.str4,
        instructionsHTML.str5
      ],
      force_wait: 2000,
      show_clickable_nav: true, // display buttons for navigating the page
      allow_backward: false, // allow back button
      allow_keys: false // allow using the keyboard for navigation
    };


    // --------------- FINAL INSTRUCTIONS --PURPOSE: NOTIFY EXP IS OVER  --------------------
    var finalMsg = {
      type: 'instructions',
      pages: [
        'Congrats! You are all done. Thanks for participating in our experiment! \
        Please click the "next" button to submit this HIT.'
      ],
      show_clickable_nav: true,
      on_finish: function () { sendData(); }
    };

    // ------------------------ MAIN_ON_START FUNCTION  ---------------

    var main_on_start = function (trial) {
      // Pass socket & game-level current bonus to trial
      trial.socket = socket;
      trial.bonus = score;
      trial.id = id;
    }; 

    // ------------------------ MAIN_ON_FINISH FUNCTION  ---------------
    var main_on_finish = function (data) {
      // add this round's bonus to score
      if (!data.training && data.bonus) {
        score = score + data.bonus; 
      }
    }; 

    socket.emit('getStim', {gameID: id});
    socket.on('stimulus', _trials => {
      console.log('received', _trials)
      // Now construct trials list
      var trials = _.map(_.shuffle(_trials['trials']), (trial, i) => {
	console.log(trial);
        return _.extend({'type' : 'object-mapping'}, trial, {
	  trialNum : i,
	  numTrials : _trials['trials'].length,
	  on_start : main_on_start,
	  on_finish : main_on_finish
	});
      });
      
      // now add on the PRE (intro/practice/consent) trials, if applicable and the POST trials (goodbye)    
      if(includeIntro)
        trials.unshift(introMsg);

      if(includeGoodbye)
        trials.push(finalMsg);
      
      jsPsych.init({     // start game
        timeline: trials, // takes in the trials object to be displayed 
        default_iti: 1000,
        show_progress_bar: true
      }); // close init
    });
  }); // close socket.on

}; // close setupExp
