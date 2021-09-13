## Analysis

All reported analyses of behavior in our repeated reference task are reproducible via `refgame.Rmd` and all diagnosticity analyses are reproducible via `diagnosticity.Rmd`.

These notebooks have been tested on MacOS 11.0.0 (Big Sur) using R version 4.0.3, RStudio version 1.3, and the `tidyverse` package bundle version 1.3.1 (2021-04-15) with `lme4` version 1.1 and `brms` 2.14.4. 

### Pre-processing

While we have provided all data necessary for reproducing our results in a convenient, pre-processed form (see `/data`), we have also included a series of files to fully reproduce this pre-processing pipeline from the raw data. Because our analyses rely heavily on features extracted from image processing, our analysis pipeline begins with a number of python scripts. In rough order of dependencies: 

* `generate_refgame_dataframe.py` pulled refgame data from our database and created the csvs in `../data/experiment`
* `generate_recog_dataframe.py` did the same for our control experiments
* `render_sketches.py` created png files for all sketches
* `object_mapping_analysis.ipynb` computed diagnosticity heat maps over the target images using diagnosticity annotations
* `stroke_mapping_analysis.ipynb` computed stroke masks over the target images using stroke mapping annotations
* `sketch_object_correspondence.ipynb` computed diagnosticity features given all of these masks

## Feature extraction

The most computationally-intensive pre-processing step is to extract high-dimensional visual features from the sketch pngs (available in `../data/features`). 

On a machine with GPU access and cuda version > 10.2, please run

```
python extract_features.py --data='../../data/diagnosticity/sketches/refgame1.2/png' --layer_ind=6 --data_type='sketch' --spatial_avg=True --crop_sketch=False
```

```
python extract_features.py --data='../../data/diagnosticity/sketches/refgame2.0/png' --layer_ind=6 --data_type='sketch' --spatial_avg=True --crop_sketch=False
```
