/**
 * jspsych-stroke-mapping
 * 
 * plugin to obtain mapping between individual strokes of a sketch and the corresponding regions of a target image 
 *
 * documentation: docs.jspsych.org
 *
 * developed by Robert Hawkins (roberth@princeton.edu), Hui Xin Ng (hxng@ucsd.edu) & Judy Fan (jefan@ucsd.edu) Nov 2019
 * 
 **/
jsPsych.plugins['jspsych-stroke-mapping'] = (function () {
  
  var plugin = {};

  plugin.info = {
    name: 'jspsych-stroke-mapping',
    description: '',
    parameters: {
      svgString: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'sketch SVG string',
        default: undefined,
        description: 'SVG representation of sketch to be annotated'
      },
      category: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'category',
        default: undefined,
        description: 'object category'
      },          
      condition: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'condition',
        default: undefined,
        description: 'experimental condition'
      }, 
      target_url: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'target URL ',
        default: undefined,
        description: 'URL of target object'
      }      
    }
  }

  class TrialDisplay {
    constructor(display_element, info) {
      this.display_element = display_element;
      this.trial = info;

      this.sketchHistoryURLs = [
                info.rep0Sketch_url, info.rep1Sketch_url, info.rep2Sketch_url,
                info.rep3Sketch_url, info.rep4Sketch_url, info.rep5Sketch_url,
                info.rep6Sketch_url, info.rep7Sketch_url
      ];

      this.bonus = info.currentBonus ? info.currentBonus : 0;
      this.totalStrokes = 0;
      this.pathArray = new Array; 
      this.colorFlag = false; 
      this.splineArcLengthThreshold = 36;
      this.colorChecked = false; 
      this.currIndex = 0;             
      this.showCueTimestamp  = null;      

      // paper.js canvas objects to contain target image and sketch 
      this.mypapers = [
        new paper.PaperScope(),
        new paper.PaperScope()
      ]; 

      // paintbrush tool 
      this.numPaintPath = 0; 
      this.paintArray = []; 
      this.paintPathGroup = null; 
      this.paintPath = null; 
      this.completeHeatmap = [];
      this.makePaintTool();
    }

    setup() {
      return new Promise(resolve => {
	this.display_element.innerHTML="";
        console.log('setting up');
	console.log(this.trial);
        const trial = this.trial;
        const instruction_content = document.createElement('instruction_content');

        instruction_content.innerHTML = '\
          <p id="trialNum"> '+ (trial.trialNum + 1) + " / " + trial.numTrials + '</p>\
          <div class="container">\
            <div class="row">\
              <p>Please paint over the part of the chair that the highlighted stroke represents.</p>\
            </div>\
            <div class="row">\
              <div class="col">\
                <canvas id="myCanvas" hidpi="off"></canvas> \
              </div>\
              <div class="col">\
                <div class="pCanvasWrapper">\
                  <canvas id="pCanvas" hidpi="off">  </canvas>\
                  <img src=" '+ trial.target_url + '" id = "targetImg">\
                  <div>\
                    <button id = "nextButton" class="btn btn-sm btn-light py-10" type="button" >next stroke</button> \
                    <button id = "clearCanvas" class="btn btn-sm btn-light py-10" type="button"> clear</button> \
                  </div> \
                </div>\
              </div> \
            </div> \
            <div class="row">\
              <p id="error_message" class="col" style="position:absolute; left: -15%; display:none"> \
                Please mark image before continuing!\
              </p> \
            </div> \
          </div>\
          <div id="sketchHistory" class="d-flex pt-5 flex-wrap"> </div>\
        ';      

        //append instruction content to html variable
        this.display_element.appendChild(instruction_content); 

        this.mypapers[0].setup('myCanvas');
        this.mypapers[1].setup('pCanvas');

        // get myCanvas html element
        const paintPaper = this.mypapers[1]; 
        const paintCanvas = document.getElementById('pCanvas') ;
        const scope = paintPaper.setup(paintCanvas);

        this.sketchHistoryURLs.forEach(function (url, i) {
          const imgHtml = '\
            <div class="col-sm">\
              <h6 id="history' + i + '">' + (i + 1) + '</h6>\
              <img id="imghistory' + i + '" src='+ url + '> \
            </div>';
          $('#sketchHistory').append(imgHtml);
	  if(url == trial.targetSketch_url) {
	    $('#history' + i).css({"color" :"#4ff005", "font-weight":"Bold", "font-size": "25px"});
	    $('#imghistory' + i).css({'box-shadow' : '0 0 3pt 2pt #4ff005'});	    
	  }
        });
        resolve();
      });
    }

    makePaintTool () {
      // Attach paint tool to paint canvas
      this.mypapers[1].activate();
      var paintTool = new Tool(); 
      paintTool.onMouseDown = function (event) { //Define a mousedown handler
        this.paintPath = new Path(); // 
        this.paintPath.strokeColor = '#4ff005'; // set as green
        this.paintPath.strokeWidth = 12;
	      this.paintPath.strokeCap = 'round';
        this.paintPath.opacity = 0.5;
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
      // Don't move on to next trial if no paint on canvas
      if(this.paintArray.length == 0) {
      	return;
      }
	 
      // extract SVG string representation of paint      
      var paintSvgArray = _.map(this.paintArray, function (p) {
	p.simplify(10); // simplify painted curve
	var _svgString = p.exportSVG({ asString: true});
	var startSVG = _svgString.indexOf('d="') + 3;
	return _svgString.substring(startSVG, _svgString.indexOf('"', startSVG));
      });
	
      // get URI to generate png
      var dataURI = document.getElementById('pCanvas')
          .toDataURL()
          .replace('data:image/png;base64,', '');
      
      var currentPath = this.pathArray[this.currIndex];
      var svgstring = currentPath.exportSVG({ asString: true });
      var start = svgstring.indexOf('d="') + 3;

      // Send data for this spline through socket
      this.sendSplineData(_.extend({},currentPath,{ 
        "svgString": svgstring.substring(start, svgstring.indexOf('"', start)),
        "timePresented": this.showCueTimestamp, 
        "timeSubmitted": Date.now(), 
        "cumulativeTrialLatency": Date.now() - this.showCueTimestamp,
        "strokeAnnotationLatency": Date.now() - this.strokeTimestamp, 	
        "paintCanvasPng": dataURI,
        "paintSvgArray": paintSvgArray
      }));

      this.clearCanvas();
      if (this.currIndex == (this.pathArray.length - 1)) {
        this.endTrial();
      } else {
        //set previous stroke to bold & black
        currentPath.strokeWidth = 7; 
        currentPath.strokeColor = "rgb(0, 0, 0)" ;
        this.currIndex++;
	this.strokeTimestamp = Date.now();
        // if it is the 2nd stroke, and not out of the bounds 
        // set current stroke to green
        if (this.currIndex != 0 && this.currIndex < this.pathArray.length) { 
          this.pathArray[this.currIndex].strokeColor = "rgb(0, 255, 0)";
        } 
      }
    }

    sendSplineData(splineMappings) {      
     var turkInfo = jsPsych.turk.turkInfo();
	var splineData = _.extend({},_.pick(splineMappings,['paintSvgArray','svgString','length','area','timePresented','timeSubmitted','responseLatency','paintCanvasPng']),{  
        // --- TURKER INFO ---
        wID: turkInfo.workerId, 
        hitID: turkInfo.hitId, 
        aID: turkInfo.assignmentId,
	annotatorID: this.trial.id,

        // --- DATABASE INFO ---
        dbname: this.trial.dbname,
        colname: this.trial.colname, //data from this experiment
        iterationName: this.trial.iterationName,

        // additional info
        bonus: this.bonus,
        training: this.trial.training,
        time: Date.now(),        
        trialNum: this.trial.trialNum,
        condition: this.trial.condition,
        gameID: this.trial.gameID, 
        category: this.trial.category,
        subset: this.trial.subset,
        repetition: this.trial.repetition,        
        sketchNumStrokes: this.trial.numStrokes,
	  currIndex: this.currIndex,
        targetID: this.trial.target,
        targetURL: this.trial.target_url,
        targetShapenet: this.trial.target_shapenet,
        distractorShapenet: this.trial.distractors_shapenet,        
        originalOutcome: this.trial.outcome,         
        originalTrialNum: this.trial.originalTrialNum, // 
        originalViewerSelection: this.trial.response //         
      });
      // send current data back to server
      this.trial.socket.emit('splineData', splineData);  
    }
    
    // end trial is a function that takes in a dictionary of results 
    endTrial () {
      // clear instruction content while waiting for next
      this.display_element.innerHTML = "<p>You're done with this one! Please hold tight while we find another sketch."; 
      jsPsych.finishTrial(); // move on to the next trial
    }; 

    show() {
      // show sketch on sketch canvas
      this.mypapers[0].activate();
      if (this.trial.training) {
        $("#bonusMeter").text(''); 
        $("#trialNum").text('');
      }

      $("#nextButton").click(this.handleNextButton.bind(this));
      $("#clearCanvas").click(this.clearCanvas.bind(this)); 

      var svg = JSON.parse(this.trial.svgString);

      for (var k = 0; k < svg.length; k++) {
        // convert spline parameters to paper.js path objects
        const path = new Path(svg[k].toString());
        
        //Set properties for the splines
        path.strokeColor = "rgb(0,0,0)"; // set strokeColor
        path.strokeWidth = 5;
        path.masterStrokeNum = k; 
        this.pathArray.push(path);
        this.totalStrokes += 1;
      };
      // go ahead and highlight first stroke
      this.pathArray[0].strokeColor = "rgb(0,255,0)"; 
      this.showCueTimestamp = Date.now();
    } 
  }

  plugin.trial = function (display_element, trial_info) {
    var socket = trial_info.socket;
    console.log('displaying display_element');
    display_element.innerHTML = "<p>Let's start! Wait a moment while we find your first sketch!</p>";
    
    // wait for socket to send stimuli to begin
    socket.on('stimulus', stim => {
      _.extend(trial_info, _.omit(stim, 'trialNum'), { 
          training: false, 
          currentBonus: trial_info.score,
          svgString: stim.svgString,
          category: stim.category,
          originalTrialNum: stim.trialNum, 
          originalCondition: stim.condition                           
      });

      // use new info to create display
      const display = new TrialDisplay(display_element, trial_info);

      // first setup display, then show it
      display.setup().then(() => display.show());
    });

    // ask server for stimuli
    socket.emit('getStim', { gameID: trial_info.id }); 
  };
  
  return plugin;
})();
// M, c Start point (x,y), first control point (x, y), second control point (x, y), end point (x, y)
