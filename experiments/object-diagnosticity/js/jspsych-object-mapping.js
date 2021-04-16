/**
 * jspsych-object-mapping
 * 
 * plugin to obtain diagnosticity maps of each object relative to its context
 *
 * documentation: docs.jspsych.org
 *
 * developed by Robert Hawkins (roberth@princeton.edu), Hui Xin Ng (hxng@ucsd.edu) & Judy Fan (jefan@ucsd.edu) Nov 2019
 * 
 **/
jsPsych.plugins['object-mapping'] = (function () {
  
  var plugin = {};

  plugin.info = {
    name: 'object-mapping',
    description: '',
    parameters: {
      context_id: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'context',
        default: undefined,
        description: 'id of context, e.g. "diningA"'
      },
      url1: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'target url',
        default: undefined,
        description: 'url of target to be painted'
      },          
      url2: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'comparison url',
        default: undefined,
        description: 'url of object that target is compared with'
      }
    }
  }

  class TrialDisplay {
    constructor(display_element, info) {
      this.display_element = display_element;
      this.trial = info;

      // paper.js canvas objects to contain target image and sketch 
      this.mypaper = new paper.PaperScope();

      // paintbrush tool 
      this.numPaintPath = 0; 
      this.paintArray = []; 
      this.paintPathGroup = null; 
      this.paintPath = null; 
      this.makePaintTool();
    }

    setup() {
      return new Promise(resolve => {
	this.display_element.innerHTML="";
        console.log('setting up');
	console.log(this.trial);
        const trial = this.trial;
        //const instruction_content = document.createElement('instruction_content');

        this.display_element.innerHTML = '\
          <p id="trialNum"> '+ (trial.trialNum + 1) + " / " + trial.numTrials + '</p>\
          <div class="container">\
            <div class="row">\
              <p>Please paint over the part of the chair on the left that is most different from the chair on the right.</p>\
            </div>\
            <div class="row">\
              <div class="col">\
                <div class="row pCanvasWrapper">\
                  <canvas id="pCanvas" hidpi="off">  </canvas>\
                  <img src=" '+ trial.url1 + '" id = "targetImg">\
                </div>\
                <div class="row justify-content-center">\
                    <button id = "nextButton" class="btn btn-sm btn-light py-10 mx-2" type="button" >continue</button> \
                    <button id = "clearCanvas" class="btn btn-sm btn-light py-10 mx-2" type="button">clear paint</button>\
                </div> \
              </div> \
              <div class="col">\
                <div class="pCanvasWrapper">\
                  <img src=" '+ trial.url2 + '" id = "comparisonImg">\
                </div>\
              </div> \
            </div> \
            <div class="row">\
              <p> &nbsp;</p> \
              <p id="error_message" class="col" style="display:none"> \
                Please mark image before continuing!\
              </p> \
            </div> \
          </div>\
        ';      

        //append instruction content to html variable
        //this.display_element.appendChild(instruction_content); 
	this.showCueTimestamp = Date.now();
        this.mypaper.setup('pCanvas');

        // get canvas html element
        const paintPaper = this.mypaper;
        const paintCanvas = document.getElementById('pCanvas') ;
        const scope = paintPaper.setup(paintCanvas);
        resolve();
      });
    }

    makePaintTool () {
      // Attach paint tool to paint canvas
      this.mypaper.activate();
      var paintTool = new Tool(); 
      paintTool.onMouseDown = function (event) { //Define a mousedown handler
        this.paintPath = new Path(); // 
        this.paintPath.strokeColor = '#4ff005'; // set as green
        this.paintPath.strokeWidth = 12;
	this.paintPath.strokeCap = 'round';
        this.paintPath.opacity = 0.3;
        this.paintPath.add(event.point); 
      }.bind(this);

      paintTool.onMouseDrag = function (event) { // define a mousedrag handler
        this.paintPath.strokeColor = '#4ff005';
        this.paintPath.add(event.point); //uses same path object as in mousedown
      }.bind(this);

      paintTool.onMouseUp = function (event) {
        this.paintPath.strokeColor = '#4ff005';
        this.paintPath.add(event.point);
        this.numPaintPath += 1; // when mouse is lifted, increment number of paths
        this.paintArray.push(this.paintPath); 
      }.bind(this);
    }


    clearCanvas() {
      // paintPathGroup contains many paths that correspond to same obj part
      this.paintPathGroup = new Group({ 
        children: this.paintArray,
      });

      // reset paintArray to empty
      this.paintArray = []; 
      this.paintPathGroup.visible = false; // main point of function, hide the brushes
      this.paintPathGroup.removeChildren(); // remove children from the group
    }

    handleNextButton() {
      if(this.paintArray.length == 0) {
	$('#error_message').fadeIn(1000);
	setTimeout(function() {
	  $('#error_message').fadeOut(1000);
	}, 1500);
	return;
      }

      var paintSvgArray = _.map(this.paintArray, function (p) {
	p.simplify(10); // simplify painted curve
	var _svgString = p.exportSVG({ asString: true});
	var startSVG = _svgString.indexOf('d="') + 3;
	return _svgString.substring(startSVG, _svgString.indexOf('"', startSVG));
      });
      
      this.clearCanvas();

      // get URI to generate png
      var dataURI = document.getElementById('pCanvas')
          .toDataURL()
          .replace('data:image/png;base64,', '');

      // Send data for this spline through socket
      this.sendSplineData(_.extend({},{ 
        "timePresented": this.showCueTimestamp, 
        "timeSubmitted": Date.now(), 
        "responseLatency": Date.now() - this.showCueTimestamp, 
        "paintCanvasPng": dataURI,
	"paintSvgArray": paintSvgArray
      }));

      this.endTrial();
    }

    sendSplineData(splineMappings) {      
      var turkInfo = jsPsych.turk.turkInfo();
      var splineData = _.extend({}, _.pick(splineMappings, [
	'timePresented','timeSubmitted','responseLatency','paintCanvasPng', 'paintSvgArray'
      ]),{ 
        // --- TURKER INFO ---
        wID: turkInfo.workerId, 
        hitID: turkInfo.hitId, 
        aID: turkInfo.assignmentId, 

        // --- DATABASE INFO ---
        dbname: 'semantic_mapping',
        colname: 'object_mapping', //data from this experiment
        iterationName: 'pilot1',

        // additional info
        time: Date.now(),
	gameid: this.trial.id,
	targetChair: this.trial.url1,
	comparisonChair: this.trial.url2,
	context_id: this.trial.context_id,
	trial_num: this.trial.trialNum,
	pair_id: this.trial.pair_id,
	permutation_id: this.trial.permutation_id
      });
      
      // send current data back to server
      this.trial.socket.emit('splineData', splineData);  
    }
    
    // end trial is a function that takes in a dictionary of results 
    endTrial () {
      // clear instruction content while waiting for next
      this.display_element.innerHTML = "";
      jsPsych.finishTrial(); // move on to the next trial
    }; 

    show() {
      // show sketch on sketch canvas
      if (this.trial.training) {
        $("#trialNum").text('');
      }

      $("#nextButton").click(this.handleNextButton.bind(this));
      $("#clearCanvas").click(this.clearCanvas.bind(this)); 

    }
  }
  
  plugin.trial = function (display_element, trial_info) {
    var socket = trial_info.socket;

    // use new info to create display
    const display = new TrialDisplay(display_element, trial_info);

    // first setup display, then show it
    display.setup().then(() => display.show());
  };
  
  return plugin;
})();
// M, c Start point (x,y), first control point (x, y), second control point (x, y), end point (x, y)
