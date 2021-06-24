#!/usr/bin/env python
# coding: utf-8

# In[5]:


import os, sys

import pymongo as pm
import numpy as np
import scipy.stats as stats
import pandas as pd
import json
import re
from io import BytesIO
from PIL import Image, ImageFilter

from skimage import io, img_as_float
import base64

import matplotlib
from matplotlib import pylab, mlab, pyplot
#get_ipython().run_line_magic('matplotlib', 'inline')
from IPython.core.pylabtools import figsize, getfigs
plt = pyplot
import seaborn as sns
sns.set_context('talk')
sns.set_style('white')

from IPython.display import clear_output
import importlib
import time

import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message="numpy.dtype size changed")
warnings.filterwarnings("ignore", message="numpy.ufunc size changed")


# ### set up paths

# directory & file hierarchy
proj_dir = os.path.abspath('..')
analysis_dir = os.getcwd()
results_dir = os.path.join(proj_dir,'results')
plot_dir = os.path.join(results_dir,'plots')
csv_dir = os.path.join(results_dir,'csv')
datavol_dir = '/data/datasets/semantic_mapping' ## path to data on nightingale
exp_dir = os.path.abspath(os.path.join(proj_dir,'experiments'))
sketch_dir = os.path.abspath(os.path.join(proj_dir,results_dir,'sketches'))
gallery_dir = os.path.abspath(os.path.join(proj_dir,results_dir,'gallery'))

## add helpers to python path
if os.path.join(proj_dir,'utils') not in sys.path:
    sys.path.append(os.path.join(proj_dir,'utils'))
    
import utils as u
import socket

def make_dir_if_not_exists(dir_name):   
    if not os.path.exists(dir_name):
        os.makedirs(dir_name)
    return dir_name

## create directories that don't already exist        
result = [make_dir_if_not_exists(i) for i in [results_dir,plot_dir,csv_dir,sketch_dir,gallery_dir]]


# ### load in annotations dataframe

# If you haven't already run the `generate_dataframe.py` scripy locally, do so. Once you're on nightingale, run it again to make sure that the annotations are copied to the data dir.


if socket.gethostname()=='nightingale':
    T = pd.read_csv(os.path.join(datavol_dir,'semantic_mapping_annotations.csv'),
                   usecols=['paintCanvasPng','condition','repetition','gameID','targetID', 'aID', 'wID'])
else:
    T = pd.read_csv(os.path.join(csv_dir,'semantic_mapping_annotations.csv'),
                   usecols=['paintCanvasPng','condition','repetition','gameID','targetID', 'aID','wID'])
print('There are {} records in T.'.format(T.shape[0]))    
print('These came from {} different refgames.'.format(T.gameID.nunique()))
print('These came from {} different annotation assignments.'.format(T.aID.nunique()))
print('These came from {} different worker IDs.'.format(T.wID.nunique()))
print('{} of these came are from the repeated condition.'.format(T[T['condition']=='repeated'].shape[0]))
print('{} of these came are from the control condition.'.format(T[T['condition']=='control'].shape[0]))
print(T.info(verbose=False,memory_usage='deep'))


# ### divide CSV data into batches to ease image processing



importlib.reload(u)

## assign unique sketch identifiers
T = (T.assign(sketch_id = T.apply(lambda x: 
    '{}_{}_{}'.format(x['gameID'], x['targetID'], x['repetition']),axis=1)))

## divide CSV data into batches to ease image processing
sketch_ids = T.sketch_id.unique()
for i,curr_batch in enumerate(u.batch(sketch_ids, 100)):
    t = T[T['sketch_id'].isin(curr_batch)]
    out_path = os.path.join(datavol_dir,'semantic_mapping_annotations_batch{}.csv'.format(i))
    t.to_csv(out_path)
    print('Saved batch to {}'.format(out_path))
    clear_output(wait=True)
print('Done! Saved {} batches in total.'.format(i))


# ### now iterate through batches of dataset and apply image processing

single_sketch_map_dir = os.path.join(datavol_dir,'single_sketch_maps')    
targetRep_sketch_map_dir = os.path.join(datavol_dir,'targetRep_sketch_maps')
result = [make_dir_if_not_exists(i) for i in [single_sketch_map_dir, targetRep_sketch_map_dir]]


### load in chunks of dataframe at a time to do all preprocessing
data_dir = datavol_dir if socket.gethostname()=='nightingale' else csv_dir
batch_paths = [os.path.join(data_dir,i) for i in os.listdir(data_dir) if i.split('_')[-1][:5]=='batch']

start = time.time()
for batch_ind, path in enumerate(batch_paths):
    print('Analyzing batch {} of {}'.format(batch_ind, len(batch_paths)))
    T = pd.read_csv(path)    
    ## filter for repeated condition sketches only
    T = T[T['condition']=='repeated']
    ## apply preprocessing to get base heatmaps
    ims = T.apply(lambda x: Image.open(BytesIO(base64.b64decode(x['paintCanvasPng']))), axis=1)
    print('Finished converting png strings to PIL Images. {} seconds elapsed.'.format((time.time() - start)))
    imsb = ims.apply(lambda x: x.convert('RGB'))
    print('Finished converting to RGB. {} seconds elapsed.'.format(np.round(time.time() - start,3)))
    ## add arrays to the big T dataframe
    T = T.assign(arrs = imsb.apply(lambda x: np.array(x).astype(np.uint16)))
    T = T.assign(valid_imsize = T.apply(lambda x: True if x['arrs'].shape[0]==300 else False, axis=1))
    print('Finished adding image arrays to big dataframe. {} seconds elapsed.'.format(time.time() - start))
    ## filter for images that have correct image size (300x300)
    T = T[T['valid_imsize']==True]

    ## add identifier for (target, rep) combinations
    T = T.assign(target_rep = T.apply(lambda x: '{}_{}'.format(x['targetID'], str(x['repetition'])), axis=1))
    print('Finished filtering for valid images.')
    end = time.time()
    print('{} seconds elapsed for image preprocessing.'.format(np.round(end-start,3)))
    
    ## create H dictionary for each target and repetition for EACH PARTICIPANT
    H = dict()
    for name, group in T.groupby(['target_rep','gameID']):
        if not name[0] in H.keys():
            H[name[0]] = dict()
        combined = np.amax(np.stack(np.array(group['arrs']),axis=3), axis=3)
        H[name[0]][name[1]] = (Image.fromarray((u.minmaxnorm(combined) * 255)
                                  .astype(np.uint8))
                                  .filter(ImageFilter.GaussianBlur(radius=1))
                                  .convert('L'))
        # save image out as PNG
        out_path = os.path.join(datavol_dir,'single_sketch_maps','{}_{}.png'.format(name[1],name[0]))
        H[name[0]][name[1]].save(out_path)
        print('batch {} | Saved out PNG for {} from {}'.format(batch_ind, name[0], name[1]))       
        clear_output(wait=True)
                                            
print('Done!')
end = time.time()
print('{} seconds elapsed total.'.format(np.round(end-start,3)))        

S = [os.path.join(datavol_dir,'single_sketch_maps',i) for i in os.listdir(single_sketch_map_dir)]
assert len(np.unique(['_'.join(i.split('_')[-3:]) for i in S])) == 16*8
target_reps = np.unique(['_'.join(i.split('_')[-3:]).split('.')[0] for i in S])
G = dict()

for tr,this_targ in enumerate(target_reps):
    G[this_targ] = dict()    
    matches = [i for i in S if '_'.join(i.split('_')[-3:])==this_targ+'.png']
    avg = np.mean(np.array([np.array(Image.open(match)) for match in matches]), axis=0)
    G[this_targ]['target'] = '_'.join(this_targ.split('_')[:2])
    G[this_targ]['layers'] = len(matches)
    im = (Image.fromarray(avg.astype(np.uint8))
                                      .filter(ImageFilter.GaussianBlur(radius=1))
                                      .convert('L'))
    # save image out as PNG
    out_path = os.path.join(datavol_dir,'targetRep_sketch_maps','{}.png'.format(this_targ))
    im.save(out_path)
    print('{} of {} |Saved out PNG for {}'.format(tr,len(target_reps),this_targ))
    clear_output(wait=True)
    
# save out metadata    
out_path = os.path.join(datavol_dir,'targetRep_map_meta.js')
with open(out_path, 'w') as fout:
    json.dump(G, fout)    
print('Done!')

## render heat map gallery
with open(os.path.join(datavol_dir,'targetRep_map_meta.js')) as f:
    G = json.load(f)
u.render_heatmap_gallery(G, gallery_dir = gallery_dir, 
                         data_dir = '/data/datasets/semantic_mapping/targetRep_sketch_maps',
                         num_reps = 8, 
                         show_fig = True)



