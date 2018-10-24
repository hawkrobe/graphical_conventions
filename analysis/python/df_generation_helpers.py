from __future__ import division

import os
#import urllib, cStringIO

import json

import os
import pandas as pd
import numpy as np
from numpy import shape
from PIL import Image
import base64

import scipy.stats as stats
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import seaborn as sns
import re
sns.set_context('poster')
colors = sns.color_palette("cubehelix", 5)

def get_complete_and_valid_games(games,
                                 coll,       
                                 iterationName,
                                 researchers,
                                 tolerate_undefined_worker=False):
    '''
    Input: 
        -- games: a list of gameIDs that are in the database, and a list of the researcher worker ID's
        -- coll: the mongodb collection, e.g., db['3dObjects']['graphical_conventions']
        -- researchers: the list of researchers, which we exclude from our analysis 
        -- tolerate_undefined_worker: *only in debug mode*, we can allow games through that have undefined worker ID's
    Output: Returns list of complete and valid gameID, defined as: 
        -- a complete game (correct number of trials==40)
        -- there were two real MTurk workers participating (i.e., not a researcher or undefined worker)

    '''
    complete_games = []
    for i, game in enumerate(games):
        num_clicks = coll.find({'$and': [{'gameid':game},{'eventType':'clickedObj'},{'iterationName':iterationName}]}).count()
        ## check to make sure there were two real mturk workers participating who were not researchers
        real_workers = False
        viewer = coll.find({'$and': [{'gameid':game},{'eventType':'clickedObj'},{'iterationName':iterationName}]}).distinct('workerId')
        sketcher = coll.find({'$and': [{'gameid':game},{'eventType':'stroke'},{'iterationName':iterationName}]}).distinct('workerId')
        if viewer == 'A1V2P0JYPD7GM6' or sketcher == 'A1V2P0JYPD7GM6':
            print("A1V2P0JYPD7GM6 did complete HIT")
        if viewer == 'A6FE2ZQNFW12V' or sketcher == 'A6FE2ZQNFW12V':
            print("A6FE2ZQNFW12V did complete HIT")
        viewer_is_researcher = viewer in researchers
        sketcher_is_researcher = sketcher in researchers  
        try:
            viewer_check = (len(viewer[0])>10) & len(viewer)==1 ## length of workerID string should be long enough & there should be exactly one viewer
            sketcher_check = (len(sketcher[0])>10) & len(sketcher)==1 ## length of workerID string should be long enough & there should be exactly one viewer    
            if (viewer_check) & (sketcher_check) & (not viewer_is_researcher) & (not sketcher_is_researcher):
                real_workers = True
            if tolerate_undefined_worker:
                real_workers = True
        except:
            if (len(game) < 1):
                print ('There was something wrong with this game {}'.format(game))

        ## check to make sure there are the correct number of clicked Obj events, which should equal the number of trials in the game   
        finished_game = False

        if (iterationName == 'run2_chairs1k_size6' or iterationName == 'run3_size6_waiting'):
            if num_clicks == 48:
                finished_game = True
        else:
            if num_clicks == 40:
                finished_game = True
       

        ##print game, viewer_check, sketcher_check, viewer_is_researcher, sketcher_is_researcher, num_clicks
            
        ## now if BOTH of the above conditions are true, bother to analyze them
        if (real_workers) & (finished_game):
            complete_games.append(game)
    print ('There are {} complete games in total.'.format(len(complete_games)))
    return complete_games

###############################################################################################

def generate_dataframe(coll, complete_games, iterationName, results_dir):

    # preprocessing 

    TrialNum = []
    GameID = []
    Condition = []
    Target = []
    Category = []
    Distractor1 = []
    Distractor2 = []
    Distractor3 = []
    Outcome = []
    Response = []
    Repetition = []
    Generalization = []
    Phase = []
    numStrokes = []
    drawDuration = [] # in seconds
    svgStringLength = [] # sum of svg string for whole sketch
    svgStringLengthPerStroke = [] # svg string length per stroke
    numCurvesPerSketch = [] # number of curve segments per sketch
    numCurvesPerStroke = [] # mean number of curve segments per stroke
    svgStringStd = [] # std of svg string length across strokes for this sketch
    Outcome = [] #accuracy (True or False)
    png=[] # the sketch 
    timedOut=[] # True if sketchers didn't draw anything, False o.w.
    meanPixelIntensity=[]

    y = ['3601-5426f18c-ab9f-40c9-b627-e4d09ce1679a'] ## game where trial 4 was repeated 
    _complete_games= [item for item in complete_games if item not in y]
    for i,g in enumerate(_complete_games):
            print( 'Analyzing game {} | {} of {}: '.format(g, i, len(_complete_games)))

            # collection of all clickedObj events in a particular game 
            X = coll.find({ '$and': [{'gameid': g}, {'eventType': 'clickedObj'}]}).sort('time')
            # collection of all stroke events in a particular game 
            Y = coll.find({ '$and': [{'gameid': g}, {'eventType': 'stroke'}]}).sort('time')

            for t in X: # for each clickedObj event
                targetname = t['intendedName']
                category = OBJECT_TO_CATEGORY_run2[targetname]
                Phase.append(t['phase'])
                Repetition.append(t['repetition'])
                distractors = [t['object2Name'],t['object3Name'],t['object4Name']]
                full_list = [t['intendedName'],t['object2Name'],t['object3Name'],t['object4Name']] 
                png.append(t['pngString'])

                #for each stroke event with same trial number as this particular clickedObj event 
                y = coll.find({ '$and': [{'gameid': g}, {'eventType': 'stroke'}, {'trialNum': t['trialNum']}]}).sort('time')
                # have to account for cases in which sketchers do not draw anything 
                if (y.count() == 0):
                    numStrokes.append(float('NaN'))
                    drawDuration.append(float('NaN'))
                    svgStringLength.append(float('NaN'))
                    svgStringLengthPerStroke.append(float('NaN'))
                    numCurvesPerSketch.append(float('NaN'))
                    numCurvesPerStroke.append(float('NaN'))
                    svgStringStd.append(float('NaN'))
                    meanPixelIntensity.append('NaN')
                    timedOut.append(True)
                else: 
                    y = coll.find({ '$and': [{'gameid': g}, {'eventType': 'stroke'}, {'trialNum': t['trialNum']}]}).sort('time')
                    lastStrokeNum = float(y[y.count() - 1]['currStrokeNum']) # get currStrokeNum at last stroke
                    ns = y.count()
                    if not lastStrokeNum == ns:
                        print ("ns: " + str(ns))
                        print ("lastStrokeNum: " + str(lastStrokeNum))

                    numStrokes.append(lastStrokeNum)

                    # calculate drawDuration 
                    startStrokeTime =  float(y[0]['startStrokeTime'])
                    endStrokeTime = float(y[y.count() - 1]['endStrokeTime']) ## took out negative 1 
                    duration = (endStrokeTime - startStrokeTime) / 1000
                    drawDuration.append(duration)

                    # calculate other measures that have to do with sketch 
                    ls = [len(_y['svgData']) for _y in y]
                    svgStringLength.append(sum(ls))
                    y = coll.find({ '$and': [{'gameid': g}, {'eventType': 'stroke'}, {'trialNum': t['trialNum']}]}).sort('time')            
                    num_curves = [len([m.start() for m in re.finditer('c',str(_y['svgData']))]) for _y in y] ## gotcha: need to call string on _y['svgData'], o/w its unicode and re cant do anything with it
                    numCurvesPerSketch.append(sum(num_curves))
                    numCurvesPerStroke.append(sum(num_curves)/lastStrokeNum)
                    svgStringLengthPerStroke.append(sum(ls)/lastStrokeNum)
                    svgStringStd.append(np.std(ls))
                    timedOut.append(False)

                    ## calculate pixel intensity (amount of ink spilled) 

                    imsize = 100
                    numpix = imsize**2
                    thresh = 250
                    imgData = t['pngString']
                    filestr = base64.b64decode(imgData)
                    fname = os.path.join('sketch.png')
                    with open(fname, "wb") as fh:
                        fh.write(imgData.decode('base64'))
                    im = Image.open(fname).resize((imsize,imsize))
                    _im = np.array(im)
                    
                    meanPixelIntensity.append(len(np.where(_im[:,:,3].flatten()>thresh)[0])/numpix)
                    #print "trialNum: {}, meanPixelintensity: {}".format(t['trialNum'], len(np.where(_im[:,:,3].flatten()>thresh)[0])/numpix)

                ### aggregate game metadata
                TrialNum.append(t['trialNum'])
                GameID.append(t['gameid'])        
                Target.append(targetname)
                Category.append(category)
                Condition.append(t['condition'])
                Response.append(t['clickedName'])
                Outcome.append(t['correct'])
                Distractor1.append(distractors[0])
                Distractor2.append(distractors[1])
                Distractor3.append(distractors[2])  
                if (iterationName == 'run3_size4_waiting'):
                    Generalization.append('within')
                else:
                    Generalization.append('between')
                    
    
    ## now actually make dataframe
    GameID,TrialNum,Condition, Target, Category, Repetition, Phase, Generalization, drawDuration, Outcome, Response, numStrokes, meanPixelIntensity, svgStringLength, svgStringLengthPerStroke, svgStringStd, numCurvesPerSketch, numCurvesPerStroke, timedOut, png = map(np.array, \
    [GameID,TrialNum,Condition, Target, Category, Repetition, Phase, Generalization, drawDuration, Outcome, Response, numStrokes, meanPixelIntensity,svgStringLength, svgStringLengthPerStroke, svgStringStd, numCurvesPerSketch, numCurvesPerStroke, timedOut,png])    

    Repetition = map(int,Repetition)

    _D = pd.DataFrame([GameID,TrialNum,Condition, Target, Category, Repetition, Phase, Generalization, drawDuration, Outcome, Response, numStrokes, meanPixelIntensity,svgStringLength, svgStringLengthPerStroke, svgStringStd, numCurvesPerSketch, numCurvesPerStroke, timedOut, png], 
                     index = ['gameID','trialNum','condition', 'target', 'category', 'repetition', 'phase', 'Generalization', 'drawDuration', 'outcome', 'response', 'numStrokes', 'meanPixelIntensity', 'svgStringLength', 'svgStringLengthPerStroke', 'svgStringStd', 'numCurvesPerSketch', 'numCurvesPerStroke', 'timedOut', 'png'])
    _D = _D.transpose()

    # filter out crazy games (low accuracy and timeouts)
    accuracy_list = []
    timed_outs = []

    for g in _complete_games:
        D_ = _D[_D['gameID'] == g]
        all_accuracies = [d['outcome'] for i, d in D_.iterrows()]
        mean_accuracy = sum(all_accuracies) / float(len(all_accuracies))
        accuracy_list.append(mean_accuracy)
        if any(d['timedOut'] == True for i, d in D_.iterrows()):
            print ("timed out!")
            timed_outs.append(g)

    arr = np.array(accuracy_list)
    med = np.median(arr)
    sd = np.std(arr)
    crazy_games = [_complete_games[i] for i, acc in enumerate(accuracy_list) if (med-acc)/sd > 3]
    crazy_games = crazy_games + timed_outs
    if (len(crazy_games) > 0):
        print ("there were some crazy games: ", crazy_games)
    #complete_games= [item for item in _complete_games if item not in crazy_games]                 
    D = _D.loc[~_D['gameID'].isin(crazy_games)]

    # save out dataframe to be able to load in and analyze later w/o doing the above mongo querying ...
    D.to_csv(os.path.join(results_dir,'graphical_conventions_group_data_{}.csv'.format(iterationName)))

    #D_dining_repeated = D[(D['category'] == 'dining')& (D['condition'] == 'repeated')]
    # Just look at one game 

    return D

###############################################################################################

def filter_crazies(D, dv):
    arr = np.array(D[dv])
    keep = []
    for i, d in D.iterrows():
        if d[dv] < np.median(arr) + 3 * np.std(arr):
            keep.append(i)
    D_filtered = D.loc[keep]
    return D_filtered

###############################################################################################

### normalizing dataframe in terms of numstrokes
def grand_mean_normalize(D_normalized, dv, _complete_games):

    grand_mean = float(sum(list(D_normalized[dv])) / float(len(list(D_normalized[dv]))))
    for g in _complete_games:
        if g in list(D_normalized['gameID']):
            D_subject = D_normalized[D_normalized['gameID'] == g]
            subject_mean = float(sum(list(D_subject[dv])) / float(len(list(D_subject[dv]))))
            for i, d in D_normalized.iterrows():
                if d['gameID'] == g:
                    D_normalized.ix[i, dv] = float(d[dv]  - subject_mean + grand_mean)
                
    return D_normalized

###############################################################################################

def save_sketches(D, complete_games, sketch_dir, dir_name, iterationNum):
    for g in list(D['gameID']):
        print ("saving sketches from game: {}".format(g))
        if g in list(D['gameID']):
            _D = D[D['condition'] == 'repeated']
            for i,_d in _D.iterrows():
                imgData = _d['png']
                trialNum = _d['trialNum']
                target = _d['target']
                repetition = _d['repetition']
                filestr = base64.b64decode(imgData)
                fname = 'sketch.png'
                with open(fname, "wb") as fh:
                    fh.write(imgData.decode('base64'))
                im = Image.open(fname)
                #im = im.convert("RGB")
                ### saving sketches to sketch_dir 
                filepath = os.path.join('{}_{}_{}_{}_{}.png'.format(g,trialNum,target, repetition, iterationNum))     
                if not os.path.exists(os.path.join(sketch_dir,dir_name)):
                    os.makedirs(os.path.join(sketch_dir,dir_name))
                im.save(os.path.join(sketch_dir,dir_name,filepath))
                
###############################################################################################

