# Graphical conventions: learning from iterated visual communication
How do people agree on ways of communicating visual concepts?


## workflow

- **Run human experiments**
  - communication task (`/experiments/refgame/draw_chairs/`)
    - Input: Shapenet chair collection and experimental design
    - Output: Human sketches and viewer decisions over time, communication efficiency timecourse
  - recognition task (`/experiments/recog/`)
    - Input: Sketches from communication task and 3D objects
    - Output: Sketch recognizability in context (4 objects) w/o interaction history

- **Analyze human task performance data**
  - `/analysis/ipynb/golden/generate_refgame_dataframe.py`
    - Input: raw mongo database records
    - Output: tidy formatted dataframes containing key behavioral variables (`XX.csv`, `BIS.csv`)
  - `/analysis/rmd/analyze_refgame_dataframe.Rmd`
    - Input: tidy dataframe generated by `generate_refgame_dataframe.py`
    - Output: timecourse visualizations of key behavioral variables; results of linear mixed effects modeling of timecourse
  - `/analysis/ipynb/golden/generate_recog_dataframe.py`
    - Input: raw mongo database records
    - Output: tidy formatted dataframes containing key behavioral variables (`XX.csv`, `BIS.csv`)
  - `/analysis/ipynb/golden/analyze_recog_dataframe.py`
    - Input: tidy dataframe generated by `generate_recog_dataframe.py`
    - Output: timecourse visualizations of key behavioral variables; results of linear mixed effects modeling of timecourse

- **Model-based analyses of sketch data**
  - `/analysis/golden/analyze_sketch_features.py`
    - Input: sketch features generated by `extract_sketch_features.py`
    - Output: timecourse visualizations of key sketch feature variables

- **Write paper**
  - [CogSci '19 paper](https://cogtoolslab.github.io/pdf/hawkinsano_cogsci_2019.pdf)
