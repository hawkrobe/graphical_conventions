# Graphical conventions: learning from iterated visual communication

How do people agree on ways of communicating visual concepts?

**Note: This repo reflects the state of the codebase used for the journal article. To access the earlier version of the codebase as of CogSci 2019, please refer to: https://github.com/cogtoolslab/graphical_conventions_cogsci19.**

## Experiments

We ran four different experiments. Please see the [README](https://github.com/hawkrobe/graphical_conventions/blob/master/experiments/README.md) inside the `./experiments` subdirectory for installation instructions. 

* initial repeated communication task (`/experiments/reference-game/`)
* sketch recognition task (`/experiments/recognition/`)
* sketch-mapping task linking strokes to regions of target object (`/experiments/sketch-mapping/`)
* diagnosticity mapping task (`/experiments/object-diagnosticity/`)

## Data

Pull down pre-processed data by running `/data/download_data.py`

## Analyses

* Reproduce behavioral analyses by running `/analysis/refgame.Rmd` notebook.
* Reproduce diagnosticity analyses by running `/analysis/diagnosticity.Rmd` notebook.

# Dependencies

We have tested our code on machines running MacOS version 11.x.x and Ubuntu 18.x.x. We do not recommend using Windows. 

The easiest way to reproduce our Python code is to install the [miniconda](https://docs.conda.io/en/latest/miniconda.html) package manager and create a new environment from our specification:

`conda create --name graphical_conventions --file requirements.txt`
