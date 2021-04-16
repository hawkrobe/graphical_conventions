import pandas as pd
import pymongo as pm
import json

# this auth.json file contains credentials
with open('auth.json') as f :
    auth = json.load(f)
print(auth)
user = auth['user']
pswd = auth['password']

# initialize mongo connection
conn = pm.MongoClient('mongodb://{}:{}@127.0.0.1'.format(user, pswd))

# get database for this project
db = conn['stimuli']

# get stimuli collection from this database
print('possible collections include: ', db.collection_names())
stim_coll = db['graphical_conventions_object_annotation']

# empty stimuli collection if already exists
# (note this destroys records of previous games)
if stim_coll.count() != 0 :
    stim_coll.drop()

# Loop through evidence and insert into collection
trial_sets = pd.read_csv('./permutations.csv')

for group_name, group in trial_sets.groupby('permutation_id') :
    trials = []
    for row_i, row in group.iterrows() :
        trials.append(row.to_dict())
    print(group_name)
    print(trials)
    packet = {
        'trials' : trials,
        'permutation_id' : group_name,
        'numGames': 0,
        'games' : []
    }
    stim_coll.insert_one(packet)

print('checking one of the docs in the collection...')
print(stim_coll.find_one())

# Uncomment below to also wipe data
# db2 = conn['semantic_mapping']
# data_col = db2['object_mapping']
# data_col.drop()
