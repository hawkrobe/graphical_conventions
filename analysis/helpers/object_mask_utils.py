import os, sys

import pymongo as pm
import numpy as np
import scipy.stats as stats
import pandas as pd
import json
import re
from io import BytesIO
import requests
from PIL import Image
from skimage import io, img_as_float
import base64

import matplotlib
from matplotlib import pylab, mlab, pyplot
from IPython.core.pylabtools import figsize, getfigs
plt = pyplot
import seaborn as sns
sns.set_context('talk')
sns.set_style('white')

from IPython.display import clear_output
import importlib

import warnings

GC2SHAPENET = dict(dining_00='30afd2ef2ed30238aa3d0a2f00b54836',
                     dining_01='30dc9d9cfbc01e19950c1f85d919ebc2',
                     dining_02='4c1777173111f2e380a88936375f2ef4',
                     dining_03='3466b6ecd040e252c215f685ba622927',
                     dining_04='38f87e02e850d3bd1d5ccc40b510e4bd',
                     dining_05='3cf6db91f872d26c222659d33fd79709',
                     dining_06='3d7ebe5de86294b3f6bcd046624c43c9',
                     dining_07='56262eebe592b085d319c38340319ae4',
                     waiting_00='1d1641362ad5a34ac3bd24f986301745',
                     waiting_01='1da9942b2ab7082b2ba1fdc12ecb5c9e',
                     waiting_02='2448d9aeda5bb9b0f4b6538438a0b930',
                     waiting_03='23b0da45f23e5fb4f4b6538438a0b930',
                     waiting_04='2b5953c986dd08f2f91663a74ccd2338',
                     waiting_05='2e291f35746e94fa62762c7262e78952',
                     waiting_06='2eaab78d6e4c4f2d7b0c85d2effc7e09',
                     waiting_07='309674bdec2d24d7597976c675750537',)

SHAPENET2GC = dict((y,x) for x,y in GC2SHAPENET.items())

def render_images(D, 
                 data = 'paintCanvasPng',
                 metadata = ['condition','category'],
                 out_dir = './sketches',
                 delimiter = '_',
                 overwrite = True,
                 clear = True):
    '''
    input: dataframe D containing png data (see data keyword argument)
           and list of metadata attributes (see metadata keyword argument)
           out_dir = which directory to save the pngs to
           delimiter = when constructing each filename, what character to stick in between each attribute
    output: return list of PIL Images;
            saves images out as PNG files to out_path 
            where each filename is constructed from concatenating metadata attributes
    '''
    for i,d in D.iterrows():         
        # convert pngData string into a PIL Image object
        im = Image.open(BytesIO(base64.b64decode(d['pngData'])))

        # construct the filename by concatenating attributes
        attributes = [str(d[attr]) for  attr in metadata]
        fname = delimiter.join(attributes)        
        
        # create the out_dir if it does not already exist
        if not os.path.exists(out_dir): 
            os.makedirs(out_dir)
            
        # now save the image out to that directory
        if (overwrite or not os.path.exists(os.path.join(out_dir,fname+'.png'))):
            print('Currently rendering {} | {} of {}'.format(d['category'],i+1,D.shape[0])) 
            im.save(os.path.join(out_dir,fname+'.png'),'PNG')
        else:
            print('Skipping {} | {} of {}'.format(d['category'],i+1,D.shape[0])) 
        if clear:
            clear_output(wait=True) 
    
    print('Done rendering {} images to {}.'.format(D.shape[0],out_dir))
    
def add_rescaled_metric(X,metric,transform='maxnorm',k=5):
    '''
    input: X is a data frame, metric is the name of one of the (cost) metrics that you want to scale between 0 and 1
            transform options include:
                :'maxnorm', which means dividing each value by maximum in list
                :'minmaxnorm', look at it
                :'minmaxnorm_sqrt': minmaxnorm then passed through square root (helps with symmetry, normalization)
                :'sigmoid', which means passing each value through logistic function with mean
    output: X with additional column that has the rescaled metric
    '''
    if metric=='drawDuration': ## if handling drawDuration, log first -- no wait, maybe not
        vals = X[metric].values
    else:
        vals = X[metric].values
    X['vals'] = vals
    if transform=='maxnorm':
        top_val = np.max(vals)
        rescaled_val = []
        for i,d in X.iterrows():
            rescaled_val.append(d['vals']/top_val)
    elif transform=='minmaxnorm':
        bottom_val = np.min(vals)
        top_val = np.max(vals)
        rescaled_val = []
        for i,d in X.iterrows():
            rescaled_val.append((d['vals']-bottom_val)/(top_val-bottom_val))
    elif transform=='minmaxnorm_sqrt':
        bottom_val = np.min(vals)
        top_val = np.max(vals)
        rescaled_val = []
        for i,d in X.iterrows():
            rescaled_val.append((d['vals']-bottom_val)/(top_val-bottom_val))
        rescaled_val = np.sqrt(np.array(rescaled_val)) ## apply sqrt at end to symmetrize
    elif transform=='sigmoid':
        median_val = np.median(vals)
        rescaled_val = []
        for i,d in X.iterrows():
            rescaled_val.append(sigmoid(d['vals'],k=k,x0=median_val))
    X['rescaled_{}'.format(metric)] = rescaled_val
    return X 

def render_heatmap_gallery(G, 
                          gallery_dir = './gallery',
                          data_dir = 'targetRep_sketch_maps',
                          num_reps = 8,
                          show_fig=True):
    '''
    input: 
         G: group dictionary containing PIL images and image arrays for each target
         gallery_dir: full path to dir where you want to save gallery image out (data destination)
         num_reps: how many repetitions of each object (determines dimensions of gallery)
    '''

    targets = np.unique(['_'.join(g.split('_')[:2]) for g in G.keys()])
    targ2row = dict(zip(targets,np.arange(len(targets))))
        
    ## make guess about how many rows and columns to use
    nrows = len(targets)
    ncols = num_reps 

    fig = plt.figure(figsize=(36,64)) 
    sns.set_style('white')

    for i, (key,value) in enumerate(G.items()):

        # get metadata
        target_name = '_'.join(key.split('_')[:2])        
        rep_num = int(key.split('_')[-1])
        num_samples = G[key]['layers']

        # make gallery
        index = (targ2row[target_name]*num_reps) + (rep_num + 1)
        p = plt.subplot(nrows,ncols,index)
        im_path = os.path.join(data_dir,'{}.png'.format(key))
        im = Image.open(im_path)
        plt.imshow(im)
        k = p.get_xaxis().set_ticklabels([])
        k = p.get_yaxis().set_ticklabels([])
        k = p.get_xaxis().set_ticks([])
        k = p.get_yaxis().set_ticks([])   
        p.axis('off')
        plt.title('{} | rep {} | obs {}'.format(target_name,rep_num,num_samples))

    fname = 'semantic_mapping.pdf'
    plt.savefig(os.path.join(gallery_dir,fname))
    if not show_fig:
        plt.close(fig)
    print('Done saving gallery figure to {}!'.format(gallery_dir))    

def batch(iterable, n=1):
    l = len(iterable)
    for ndx in range(0, l, n):
        yield iterable[ndx:min(ndx + n, l)]
        
def sigmoid(x, midpoint = 1, slope = 1):
    return 1 / (1 + np.exp(-slope * (x - midpoint)))

def normalize(x):
    x = np.array(x)
    u = np.mean(x)
    sd = np.std(x)
    normed = (x - u) / np.maximum(sd, 1e-5)
    return normed

def minmaxnorm(x):
    bottom_val = np.min(x)
    top_val = np.max(x)+1e-6
    rescaled_val = []
    y = (x - bottom_val) / (top_val - bottom_val)
    return y

def binarize_vals(val, thresh=1):
    if val>1:
        new_val = 255
    else:
        new_val = 0
    return new_val

binarize_vec = np.vectorize(binarize_vals)        

def pretty_print_dict(d, by='key'):
    '''
    sort by either key or value
    '''
    if by=='value':
        for key, value in sorted(d.items(), key=lambda item: item[1]):
            print("%s: %s" % (key, value))
    elif by=='key':
        for key in sorted(d.keys()):
            print("%s: %s" % (key, d[key]))        
    else:
        print('by keyword argument unknown: choose "key" or "value"')
        
def retrieve_image_by_url(url):
    response = requests.get(url)
    return Image.open(BytesIO(response.content))    

def clean_imshow(p, title='title'):
    k = p.get_xaxis().set_ticklabels([])
    k = p.get_yaxis().set_ticklabels([])
    k = p.get_xaxis().set_ticks([])
    k = p.get_yaxis().set_ticks([])   
    p.axis('off')
    plt.title(title)
    return p  

def unflatten_show(arr, imsize = 300):
    sns.heatmap(np.reshape(arr, (imsize,imsize)))
    

def diff_diagnosticity(im1, im2, obj_path = 'required_argument'):
    '''
    **This function deprecated as of 6/18/20**
    input: im1 = image array
           im2 = image array
           obj_path = absolute path to object diagnosticity map
    return: summed paired diagnosticity
    '''
    ## load in object map
    obj_map = np.array(Image.open(obj_path)).astype(np.float32).flatten()
    ## get pixel-paired diagnosticity difference
    im2_minus_im1 = im2 - im1
    ## "harden" these diffs, sending negative values to -1 and positive values to +1
    im21 = harden_vec(im2_minus_im1)
    ## cross these signed diffs with the diagnosticity map again to get relative diagnosticity for im2
    diag21 = im21 * obj_map 
    return np.sum(diag21) # return summed relative diagnosticity

def harden_vals(val):
    if val<0:
        new_val = -1.
    elif val >0:
        new_val = 1.
    else:
        new_val = 0
    return new_val

## vectorized version of function that sends negative values to -1, positive values to +1, keeps zero at zero
harden_vec = np.vectorize(harden_vals)            

def render_object_pair_gallery(object_pair_map_dir, pair_gallery_dir):
    '''
    input: 
        - object_pair_map_dir: path to directory containing diagnosticity maps for each object pair
        - pair_gallery_dir: path to directory to save out gallery images
    output: 1 row x 3 column gallery images in pair_gallery_dir
    '''        

    ## construct lists of paths to each diagnosticity map and pair of objects
    url_stem = 'https://s3.amazonaws.com/shapenet-graphical-conventions/{}.png'
    maps = [os.path.abspath(os.path.join(object_pair_map_dir,fname)) for fname in os.listdir(object_pair_map_dir)]
    fnames = os.listdir(object_pair_map_dir)
    targets = [url_stem.format(i.split('_')[1]) for i in fnames]
    foils = [url_stem.format(i.split('_')[2].split('.')[0]) for i in fnames]

    for ind, fname in enumerate(fnames):
        ## generate figure for each object pair
        fig = plt.figure(figsize=(12,6)) 
        sns.set_style('white')    
        p = plt.subplot(131)
        plt.imshow(Image.open(maps[ind]))
        clean_imshow(p,title='diagnosticity map')
        p = plt.subplot(132)
        plt.imshow(retrieve_image_by_url(targets[ind]))
        clean_imshow(p,title='target')
        plt.title('target')
        p = plt.subplot(133)
        plt.imshow(retrieve_image_by_url(foils[ind]))
        clean_imshow(p,title='foil')
        out_path = os.path.join(pair_gallery_dir, fname)
        plt.savefig(out_path)
        print('Saving gallery fig for pair: {}'.format(fname))
        clear_output(wait=True)
        plt.close(fig)
    
def render_target_map_gallery(target_map_dir, target_gallery_dir):
    '''
    input: 
        - target_map_dir: path to directory containing diagnosticity maps for each target object 
        - target_gallery_dir: path to directory to save out gallery images
    output: 1 row x 2 column gallery images in target_gallery_dir
    '''         
    ## construct lists of paths to each diagnosticity map and single object
    url_stem = 'https://s3.amazonaws.com/shapenet-graphical-conventions/{}.png'
    maps = [os.path.abspath(os.path.join(target_map_dir,fname)) for fname in os.listdir(target_map_dir)]
    fnames = os.listdir(target_map_dir)
    targets = [url_stem.format(i.split('.')[0]) for i in fnames]

    for ind, fname in enumerate(fnames):
        ## generate figure for each object pair
        fig = plt.figure(figsize=(12,6)) 
        sns.set_style('white')    
        p = plt.subplot(121)
        plt.imshow(Image.open(maps[ind]))
        clean_imshow(p,title='diagnosticity map')
        p = plt.subplot(122)
        plt.imshow(retrieve_image_by_url(targets[ind]))
        clean_imshow(p,title='target')
        plt.title('target')
        out_path = os.path.join(target_gallery_dir, fname)    
        plt.savefig(out_path)    
        print('Saving gallery fig out to: {}'.format(out_path))
        clear_output(wait=True)
        plt.close(fig)    