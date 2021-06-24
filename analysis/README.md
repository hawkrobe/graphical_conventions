As of October 17, 2018: Currently the "full dataset" consists of two experiment iterations: ['run3_size4_waiting','run4_generalization']. In `run3_size4_waiting`, both repeated and control items come from the same cluster. In `run4_generalization`, the control items come from a different cluster.


# Pre-processing

Because our analyses rely heavily on features extracted from image processing, our analysis pipeline begins with a bunch of python notebooks that pre-process our raw data. In rough order of dependencies: 

* `generate_refgame_dataframe.ipynb` pulled refgame data from our database and created the csvs in `../data/experiment`
* `generate_recog_dataframe.ipynb` did the same for our control experiments
* `extract_sketch_features.ipynb` extracted high-dimensional visual features from our sketches and saved them to `../data/features`
* `extract_object_segmentations.ipynb` extracted object segmentation masks (used in diagnosticity analyses to zero out low-quality annotations that 'color outside the lines')
* `object_mapping_analysis.ipynb` computed diagnosticity heat maps over the target images using diagnosticity annotations
* `stroke_mapping_analysis.ipynb` computed stroke masks over the target images using stroke mapping annotations
* `sketch_object_correspondence.ipynb` computed diagnosticity features given all of these masks

# Behavioral results

* All reported analyses of behavior in our repeated reference task are in `rmd/refgame.Rmd`. This notebook analyzes both our original dataset (`run3_run4`) and our internal replication (`run5`).

* Diagnosticity analyses are in `rmd/diagnosticity.Rmd`, which imports the pre-processed diagnosticity scores.
