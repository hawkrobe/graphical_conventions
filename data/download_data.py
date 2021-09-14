import os
import boto3
import botocore
import argparse
from glob import glob
import argparse

def str2bool(v):
    return v.lower() in ("yes", "true", "t", "1")

if __name__ == "__main__":
  parser = argparse.ArgumentParser()
  parser.add_argument('--path_to_data', type=str, help='path to data', default='./')
  parser.add_argument('--bucket_name', type=str, help='bucket_name', default='graphical-conventions')
  parser.add_argument('--overwrite', type=str2bool, help='if True, will overwrite local with download from S3',
                      default='False')
  args = parser.parse_args()

  bucket_name = args.bucket_name
  path_to_data = args.path_to_data
  overwrite = args.overwrite
  print('Bucket name: {}'.format(bucket_name))
  print('Data will download to: {}'.format(path_to_data))
  print('Overwrite local data with downloaded data from S3? {}'.format(overwrite))

  ## establish connection to s3 
  s3 = boto3.resource('s3')  
  b = s3.Bucket(bucket_name)

  print('Initiating download from S3 ...')
  datatype_list = ['experiment/','features/','sketches/', 'diagnosticity/']
  experiment_list = ['refgame1.2/', 'refgame2.0/']

  ## create data subdirs if they do not exist
  if not os.path.exists(os.path.join(path_to_data,'sketches')): 
    for datatype in datatype_list:
      for experiment in experiment_list:
        if not(datatype=='diagnosticity/' and experiment=='refgame1.2/'):
          os.makedirs(os.path.join(path_to_data, datatype, experiment))        
        if datatype=='sketches/':
          os.makedirs(os.path.join(path_to_data, datatype, experiment,'png'))
          os.makedirs(os.path.join(path_to_data, datatype, experiment,'svg'))

  ## get data from each experiment
  for datatype in datatype_list:
    for experiment in experiment_list:
      r = list(b.objects.filter(Prefix=datatype+experiment))
      for i, _r in enumerate(r):        
        if i>0 and (overwrite==True or os.path.exists(os.path.join(path_to_data,_r.key))==False):
          print('Currently downloading {} | file {} of {}'.format(_r.key, i+1, len(r)))
          s3.meta.client.download_file(bucket_name, _r.key, os.path.join(path_to_data,_r.key))
        else:
          print('Already have {} | file {} of {}'.format(_r.key, i+1, len(r)))

  ## copy data from individual refgame folders within experiment into main dir
  ## TODO: simplify naming scheme and use consistent file hierarchy 
  for experiment in experiment_list:
    x = os.listdir(os.path.join(path_to_data,'experiment', experiment))
    for _x in x:
      shutil.copy(os.path.join(path_to_data,'experiment',experiment,_x), os.path.join(path_to_data,'experiment',_x))
