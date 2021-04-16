var oldCallback;
var c;
var r;
var score = 0;

function sendData() {
  console.log('sending data to mturk');
  jsPsych.turk.submitToTurk({ 'score': score });
}

function setupExp() {

  var socket = io.connect();
  
  socket.on('onConnected', function (d) { // d is the entire session experiment

    // EXPERIMENTAL SESSION TABLE OF CONTENTS
    // Introduction: 1 instructions trial
    // Practice: 1 stroke-mapping trial
    // Consent: 1 instructions trial
    // Main Task: `numTrials`` (e.g., 10) stroke-mapping trials
    // Goodbye: 1 instructions trial

    // These are flags to control which trial types are included in the experiment
    const includeIntro = true;      
    const includeTask = true;
    const includeGoodbye = true;
    const numPreTrials = includeIntro;     
    const numPostTrials = includeGoodbye;

    var id = d.id; 

    function Experiment () {
      this.type = 'jspsych-stroke-mapping';
      this.dbname = 'semantic_mapping';
      this.colname = 'stroke_mapping';
      this.iterationName = 'pilot1';
      this.numTrials = 10;
    }

    var instructionsHTML = {
      'str1': '<p> Welcome! In this HIT you will play a \
      fun game where you will see pairs of sketches \
      and objects, and tell us what each part \
      of the sketch represents. Your total time commitment is expected to be \
      approximately 12 minutes, including the time it takes to read these \
      instructions. For your participation in this study, you will be paid $2.50.<p>',
      'str2': "<p> Each sketch you will see was made by somebody who was \
      playing a Pictionary-style game, \
      in which they (the sketcher) had to make a sketch of an object \
      so that someone else (the viewer) could tell which one out a set of four objects they \
      were trying to draw.</p> <img src= 'assets/pictionary_graphic.png' id='smallImg'></img>",    
      'str3' : "<p> Each sketch is made of a bunch of lines and curves that seem to \
      represent different parts of the object. We are interested in learning what you think each line \
      or curve corresponds to. On each trial, a sketch will appear on the left side of the screen, \
      and an object will appear on the right. </p> \
      <img src= 'assets/mapping_demo_still.png' id='largeImg'></img>",
      'str4': "<p> We will highlight a specific line in green, and your task \
      will be to paint over the part of the object that it corresponds to. \
       For example, here you would want to paint over the top part of the \
      backrest of the chair.  </p> \
      <img src= 'assets/mapping_demo_still.png' id='largeImg'></img>",
      'str5':"<p>Try to paint over everything the stroke corresponds to, but \
      also try to be precise: do not paint over anything else. \
        Once you are done, click 'next stroke'. If you make a mistake, \
       click 'clear'. Once you \
      are done with all of the strokes for the current sketch, you will move onto \
      the next sketch.</p> \
      <img src= 'assets/mapping_demo_still.png' id='largeImg'></img>",
      'str6':"<p> Sometimes people will not draw everything in the object, so it\
      may be hard to tell what a specific stroke corresponds to. For additional context, \
      we will also show you the other sketches they made of the same object, in a lineup \
      at the bottom of the screen. </p>\
      <img src= 'assets/mapping_demo_still.png' id='largeImg'></img>",
      'str7': "<p>The numbers appearing above each sketch in the lineup tell you the order in which \
      they made these sketches, from their 1st to their 8th. As you can see, \
      this example sketch was the 4th one they had made.</p>\
      <img src= 'assets/mapping_demo_still.png' id='largeImg'></img>",
      'str8' : "<p> Now that you know how this task works, here is a short video (that has been \
      sped up a bit) to show you what completing a whole sketch might look like. </p>\
      <img src= 'assets/mapping_demo.gif' id='largeImg'></img>",
      'str9': "That's it! When you are ready, click Next to begin the HIT. "
    };

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
    
    var introMsg = { //Into is the object going to be inserted into trials array
      type: 'instructions',
      pages: [
        instructionsHTML.str1, 
        consentHTML.str1,
        consentHTML.str2,        
        instructionsHTML.str2,        
        instructionsHTML.str3,
        instructionsHTML.str4,
        instructionsHTML.str5,
        instructionsHTML.str6,
        instructionsHTML.str7,
        instructionsHTML.str8,
        instructionsHTML.str9
      ],
      force_wait: 2000, 
      show_clickable_nav: true,
      allow_backward: false, 
      allow_keys: false
    };

    var previewTrial = {
      type: 'instructions',
      pages: [
        '<p> Welcome! In this HIT you will play a \
      fun game where you will see pairs of sketches \
      and objects, and tell us what each part \
      of the sketch represents. Your total time commitment is expected to be \
      approximately 12 minutes, including the time it takes to read these \
      instructions. For your participation in this study, you will be paid $2.50.\
      To proceed, please accept this HIT. <p>'
      ],
      force_wait: 2000, 
      show_clickable_nav: false,
      allow_backward: false, 
      allow_keys: false      
    }
    
    var goodbyeMsg = {
      type: 'instructions',
      pages: [
        'Congrats! You are all done. Thanks for participating in our experiment! \
        Please click the "Next" button to submit this HIT.'
      ],
      show_clickable_nav: true,
      on_finish: function () { sendData(); }
    };

    
    var main_on_start = function (trial) {
      // Pass socket & game-level current bonus to trial
      trial.socket = socket;
      trial.bonus = score;
      trial.id = id;
    }; 

    
    var main_on_finish = function (data) {
      // add this round's bonus to score
      if (!data.training && data.bonus) {
        score = score + data.bonus; 
      }
    }; 

    // Now construct trials list    
    var exp = new Experiment;
    var trials = _.map(_.range(exp.numTrials), function (n,i) {
      console.log('adding trial')
      return _.extend({}, new Experiment, {
        trialNum: i,
        on_finish: main_on_finish, 
        on_start: main_on_start,
      	svgString: 'SVG_STRING_PLACEHOLDER',
      	category: 'CATEGORY_PLACEHOLDER',
      	condition: 'CONDITION_PLACEHOLDER',
      	target_url: 'TARGET_URL_PLACEHOLDER'
      });
    });
    
    // Stick welcome trial if not previewMode, otherwise insert previewMode        
    var turkInfo = jsPsych.turk.turkInfo();
    if(includeIntro) {
      if (!turkInfo.previewMode) {
        trials.unshift(introMsg);
      } else {
        trials.unshift(previewTrial);
      }      
    }

    if(includeGoodbye)
      trials.push(goodbyeMsg);

    jsPsych.init({     // start game
      timeline: trials, // takes in the trials object to be displayed 
      default_iti: 0,
      show_progress_bar: true
    }); // close init

  }); // close socket.on

}; // close setupExp
