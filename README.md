# Graphical conventions: learning from iterated visual communication

How do people agree on ways of communicating visual concepts?

**Note: This repo reflects the state of the codebase used for the journal article. To access the earlier version of the codebase as of CogSci 2019, please refer to: https://github.com/cogtoolslab/graphical_conventions_cogsci19.**

## Software requirements

This code has been tested on MacOS version 11.x.x (Big Sur) and Ubuntu 18.x.x. We do not recommend using Windows. 

The easiest way to reproduce our Python code is to install the [miniconda](https://docs.conda.io/en/latest/miniconda.html) package manager and create a new environment from our specification:

`conda create --name graphical_conventions --file requirements.txt`

## Data

All data required to reproduce our findings can be obtained by running `/data/download_data.py`. This will create three subdirectories:

* `experiment` contains behavioral data from our original sample (`run3run4`) as well as our internal replication (`run5_submitButton`) of both the communication task and the recognition task. `group_data` and `recog_data_raw` mark the raw communication data and recognition data directly from our database, while `bis` marks the cleaned and pre-processed versions.
* `diagnosticity` contains annotations from our sketch mapping task and diagnosticity mapping task as well as pre-processed maps and masks for convenience. 
* `features` contains pre-extracted CNN features for all sketches. To re-extract features (on a GPU machine with ), please follow the instructions in `/analysis/preprocessing/`. 
* `sketches` contains raw PNG renderings of all sketches from all experimental sessions. 

If you run into difficulties using our download script, feel free to click [this link](https://graphical-conventions.s3.amazonaws.com/graphical-conventions-dataset.zip) to directly download a zipped folder containing the full dataset. Once you extract the contents of this zipped file, please move its contents into the `data/` directory in this repository before running the provided analysis code.

## Experiments

We ran four different experiments. To demo or replicate these experiments, please see the [README](https://github.com/hawkrobe/graphical_conventions/blob/master/experiments/README.md) inside the `./experiments` subdirectory for installation instructions. 

* initial repeated communication task (`/experiments/reference-game/`)
* sketch recognition task (`/experiments/recognition/`)
* sketch-mapping task linking strokes to regions of target object (`/experiments/sketch-mapping/`)
* diagnosticity mapping task (`/experiments/object-diagnosticity/`)

## Analyses

* Reproduce all analyses by running `/analysis/analysis.Rmd` notebook.
