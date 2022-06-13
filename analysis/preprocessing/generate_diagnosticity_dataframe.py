# coding: utf-8
import os, sys
import pymongo as pm
import numpy as np
import pandas as pd
from PIL import Image, ImageFilter
import base64
from io import BytesIO

import socket
import time
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--local_dir', type=str, 
	help='path to save data out', default='../results/csv/')
parser.add_argument('--datavol_dir', type=str, 
	help='path to save data out', default='/data/datasets/semantic_mapping')    
parser.add_argument('--dbname', type=str,
	help='which database', default='semantic_mapping')        
parser.add_argument('--colname', type=str,
	help='which collection? options: stroke_mapping or object_mapping', default='stroke_mapping')
parser.add_argument('--username', type=str,
	help='user name on nightingale', default='jefan')
args = parser.parse_args()

'''
See README: https://github.com/cogtoolslab/semantic_mapping/blob/master/experiments/README.md
'''

## list of iteration names
iterationNames = ['pilot1', 'pilot2']

## what kind of annotations?
annotation_type = args.colname.split('_')[0]

if socket.gethostname() !='nightingale':

	## set vars 
	auth = pd.read_csv('auth.txt', header = None) # this auth.txt file contains the password for the sketchloop user
	pswd = auth.values[0][0]
	user = 'sketchloop'
	host = 'cogtoolslab.org'

	conn = pm.MongoClient('mongodb://sketchloop:' + pswd + '@127.0.0.1:27017') 
	db = conn[args.dbname]
	coll = db[args.colname]

	## how many records do we have in this collection?
	print('We have {} records under these iterationNames.'.format(coll.count_documents({'iterationName':{'$in':iterationNames}})))	

	## dump all records from this iterationName into one dataframe
	t = coll.find({'iterationName':{'$in':iterationNames}})
	T = pd.DataFrame(t)
	print('Generated dataframe ...')

	## save out to local
	T.to_csv(os.path.join(args.local_dir,'semantic_mapping_annotations_{}.csv'.format(annotation_type)), index=False)
	print('Saved out to {}.'.format(args.local_dir))	

	## rsync up to nightingale if possible
	try:
		print('Now attempting to upload data to {} account on nightingale.'.format(args.username))
		data_path = os.path.join(args.local_dir,'semantic_mapping_annotations_{}.csv'.format(annotation_type))
		cmd = ("rsync -azvh {} {}@nightingale.ucsd.edu:~/semantic_mapping/results/csv/semantic_mapping_annotations_{}.csv"
				.format(data_path, args.username, annotation_type))
		print(cmd)
		r = os.system(cmd)
		print('Finished attempt to upload data to {} account on nightingale.'.format(args.username))
	except:
		print('Unable to upload data to nightingale. Are you on VPN?')

else: ## running on nightingale

	if not os.path.exists(os.path.join(args.local_dir,'semantic_mapping_annotations_{}.csv'.format(annotation_type))):
		print('No dataframe exists locally. Please generate first, then re-run on nightingale to move it to the shared path: {}.'.format(args.datavol_dir))
	else:
		data_path = os.path.join(args.local_dir,'semantic_mapping_annotations_{}.csv'.format(annotation_type))
		out_path = os.path.join(args.datavol_dir,'semantic_mapping_annotations_{}.csv'.format(annotation_type))
		if not os.path.exists(args.datavol_dir):
			os.makedirs(args.datavol_dir)
		cmd = ("rsync -azvh {} {}".format(data_path, out_path))		
		print(cmd)
		r = os.system(cmd)		
		print('Copied dataframe from {} to {}.'.format(args.local_dir, args.datavol_dir))	
