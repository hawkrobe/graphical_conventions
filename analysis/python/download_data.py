import os
import boto3
import botocore
import argparse
from glob import glob
import argparse

'''
To download recog + drawing data (~5.2 GB total), use command: python download_data.py 
To download recog + drawing + connect data (~95.2GB total), use command: python download_data.py --get_connectivity
'''

def str2bool(v):
    return v.lower() in ("yes", "true", "t", "1")

if __name__ == "__main__":
  parser = argparse.ArgumentParser()
  parser.add_argument('--path_to_data', type=str, help='path to data', default='./features')
  parser.add_argument('--bucket_name', type=str, help='bucket_name', default='neurosketch')
  parser.add_argument('--overwrite', type=str2bool, help='if True, will overwrite local with download from S3',
                      default='False')
  parser.add_argument('--get_connectivity', type=str2bool, help='if True, will download ~90GB connectivity features from S3',
                      default='False')  
  args = parser.parse_args()

  bucket_name = args.bucket_name
  path_to_data = args.path_to_data
  overwrite = args.overwrite
  get_connectivity = args.get_connectivity
  print('Bucket name: {}'.format(bucket_name))
  print('Data will download to: {}'.format(path_to_data))
  print('Overwrite local data with downloaded data from S3? {}'.format(overwrite))

  ## create data subdirs if they do not exist
  if not os.path.exists(os.path.join(path_to_data,'recog')):
    os.makedirs(os.path.join(path_to_data,'recog'))
    os.makedirs(os.path.join(path_to_data,'drawing'))
    os.makedirs(os.path.join(path_to_data,'connect'))

  ## establish connection to s3 
  s3 = boto3.resource('s3')  
  b = s3.Bucket(bucket_name)

  ## check if we already have downloaded dataset  
  num_recog_files = len(os.listdir('features/recog')) ## 4332
  num_drawing_files = len(os.listdir('features/drawing')) ## 620
  num_connect_files = len(os.listdir('features/connect')) ## 899
  local_data_length = num_recog_files + num_drawing_files + num_connect_files
  local_data_complete = local_data_length == 4332 + 620 + 899
  print('Currently have {} local data files. Missing {} files.'.format(local_data_length, 4332 + 620 + 899 - local_data_length))

  if not local_data_complete:
    print('Initiating download from S3 ...')
    ## get recog data
    r = list(b.objects.filter(Prefix='recog/'))
    for i, _r in enumerate(r):
      if overwrite==True or os.path.exists(os.path.join(path_to_data,_r.key))==False:
        print('Currently downloading {} | recog file {} of {}'.format(_r.key, i+1, len(r)))
        s3.meta.client.download_file(bucket_name, _r.key, os.path.join(path_to_data,_r.key))
      else:
        print('Already have {} | recog file {} of {}'.format(_r.key, i+1, len(r)))

    ## get drawing data
    d = list(b.objects.filter(Prefix='drawing/'))
    for i, _d in enumerate(d):
      if overwrite==True or os.path.exists(os.path.join(path_to_data,_d.key))==False:
        print('Currently downloading {} | drawing file {} of {}'.format(_d.key, i+1, len(d)))
        s3.meta.client.download_file(bucket_name, _d.key, os.path.join(path_to_data,_d.key))
      else:
        print('Already have {} | drawing file {} of {}'.format(_d.key, i+1, len(d)))

    ## get connect data if flag is set
    if get_connectivity: 
      c = list(b.objects.filter(Prefix='connect/'))
      for i, _c in enumerate(c):
        if overwrite==True or os.path.exists(os.path.join(path_to_data,_c.key))==False:
          print('Currently downloading {} | connect file {} of {}'.format(_c.key, i+1, len(c)))
          s3.meta.client.download_file(bucket_name, _c.key, os.path.join(path_to_data,_c.key))
        else:
          print('Already have {} | connect file {} of {}'.format(_c.key, i+1, len(c)))

  else:
    print('We already have a complete local dataset. No need to initiate download from S3.')