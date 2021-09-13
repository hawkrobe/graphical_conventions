from __future__ import division

import torch
import torchvision.models as models
import torch.nn as nn
import torchvision.transforms as transforms
import torch.nn.functional as F
from torch.autograd import Variable

from glob import glob
import os

import numpy as np
import pandas as pd
import json
import re

from PIL import Image
import base64

from embedding import *

# retrieve sketch paths
def list_files(path, ext='png'):
    result = [y for x in os.walk(path) for y in glob(os.path.join(x[0], '*.%s' % ext))]
    return result

def check_invalid_sketch(filenames,invalids_path='drawings_to_exclude.txt'):    
    if not os.path.exists(invalids_path):
        print('No file containing invalid paths at {}'.format(invalids_path))
        invalids = []        
    else:
        x = pd.read_csv(invalids_path, header=None)
        x.columns = ['filenames']
        invalids = list(x.filenames.values)
    valids = []   
    basenames = [f.split('/')[-1] for f in filenames]
    for i,f in enumerate(basenames):
        if f not in invalids:
            valids.append(filenames[i])
    return valids

def make_dataframe(Labels):    
    Y = pd.DataFrame([Labels])
    Y = Y.transpose()
    Y.columns = ['label']
    return Y

def normalize(X):
    X = X - X.mean(0)
    X = X / np.maximum(X.std(0), 1e-5)
    return X

def preprocess_features(Features, Y):
    _Y = Y.sort_values(['label'])
    inds = np.array(_Y.index)
    _Features = normalize(Features[inds])
    _Y = _Y.reset_index(drop=True) # reset pandas dataframe index
    return _Features, _Y

def save_features(Features, Y, layer_num, data_type,feat_path='/data2/jefan/chairs1k/features'):
    if not os.path.exists('./features'):
        os.makedirs('./features')
    layers = ['P1','P2','P3','P4','P5','FC6','FC7']
    np.save(os.path.join(feat_path,'FEATURES_{}_{}.npy'.format(layers[int(layer_num)], data_type)), Features)
    Y.to_csv(os.path.join(feat_path,'METADATA_{}.csv'.format(data_type)))
    return layers[int(layer_num)]

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=str, help='full path to images', default='/data2/jefan/chairs1k/pooled')
    parser.add_argument('--layer_ind', help='fc6 = 5, fc7 = 6', default=6)
    parser.add_argument('--data_type', help='"images" or "sketch"', default='images')
    parser.add_argument('--spatial_avg', type=bool, help='collapse over spatial dimensions, preserving channel activation only if true', default=True)     
    parser.add_argument('--test', type=bool, help='testing only, do not save features', default=False)  
    parser.add_argument('--ext', type=str, help='image extension type (e.g., "png")', default="png")        
    args = parser.parse_args()
    
    ## get list of all sketch paths
    image_paths = sorted(list_files(args.data,args.ext))
    print('Length of image_paths before filtering: {}'.format(len(image_paths)))
    
    ## filter out invalid sketches
    image_paths = check_invalid_sketch(image_paths)
    print('Length of image_paths after filtering: {}'.format(len(image_paths)))    
    
    ## extract features
    layers = ['P1','P2','P3','P4','P5','FC6','FC7']
    print('cuda:', torch.cuda.is_available())
    extractor = FeatureExtractor(image_paths,
                                 layer = args.layer_ind,
                                 data_type = args.data_type,
                                 spatial_avg = args.spatial_avg,
                                 use_cuda = torch.cuda.is_available())
    Features, Labels = extractor.extract_feature_matrix()   
    
    # organize metadata into dataframe
    Y = make_dataframe(Labels)
    _Features, _Y = preprocess_features(Features, Y)

    if args.test==False:
        layer = save_features(_Features, _Y, args.layer_ind, args.data_type)
       
