# Quick start

Our experiments were designed to be run in modern web browsers (e.g. Chrome 93, Firefox 71). 

Our primary communication experiment is implemented using JavaScript and `node.js`, a server-side environment that supports real-time, multi-player networking (see [Hawkins, 2015](https://link.springer.com/article/10.3758/s13428-014-0515-6) for more details). To demo this experiment, first [install node and npm](https://nodejs.org/en/). Then navigate inside the *./reference-game* subdirectory, run `npm install` to install dependencies, and then run `node app.js` to launch the experiment. The demo will then be accessible in your local browser at `localhost:8889/index.html` (open two tabs to play both roles). 

Our recognition task (`./recognition`) and diagnosticity-related annotation tasks (`./object-diagnosticity` and `./sketch-mapping`) are implemented using [`jsPsych`](https://www.jspsych.org/). To demo these experiments, please follow the same instructions as above from inside the respective sub-directory. 

## Database backend

In order to balance annotations evenly across sketches, we deployed our experiment with on a server with a mongoDB database backend: we inserted our stimuli using the `reset_stim_database.py` scripts and responded to user requests for stimuli with a server-side process launched by running `node store.js`. Note that these scripts relied upon an private `auth.json` file containing a `user` field and `password` field for the database. 

