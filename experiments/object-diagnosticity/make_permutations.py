import pandas as pd
import itertools

shapenet_30afd2ef2ed30238aa3d0a2f00b54836 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/30afd2ef2ed30238aa3d0a2f00b54836.png"};
shapenet_30dc9d9cfbc01e19950c1f85d919ebc2 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/30dc9d9cfbc01e19950c1f85d919ebc2.png"};
shapenet_4c1777173111f2e380a88936375f2ef4 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/4c1777173111f2e380a88936375f2ef4.png"};
shapenet_3466b6ecd040e252c215f685ba622927 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/3466b6ecd040e252c215f685ba622927.png"};
shapenet_38f87e02e850d3bd1d5ccc40b510e4bd = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/38f87e02e850d3bd1d5ccc40b510e4bd.png"};
shapenet_3cf6db91f872d26c222659d33fd79709 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/3cf6db91f872d26c222659d33fd79709.png"};
shapenet_3d7ebe5de86294b3f6bcd046624c43c9 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/3d7ebe5de86294b3f6bcd046624c43c9.png"};
shapenet_56262eebe592b085d319c38340319ae4 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/56262eebe592b085d319c38340319ae4.png"};
shapenet_1d1641362ad5a34ac3bd24f986301745 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/1d1641362ad5a34ac3bd24f986301745.png"};
shapenet_1da9942b2ab7082b2ba1fdc12ecb5c9e = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/1da9942b2ab7082b2ba1fdc12ecb5c9e.png"};
shapenet_2448d9aeda5bb9b0f4b6538438a0b930 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/2448d9aeda5bb9b0f4b6538438a0b930.png"};
shapenet_23b0da45f23e5fb4f4b6538438a0b930 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/23b0da45f23e5fb4f4b6538438a0b930.png"};
shapenet_2b5953c986dd08f2f91663a74ccd2338 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/2b5953c986dd08f2f91663a74ccd2338.png"};
shapenet_2e291f35746e94fa62762c7262e78952 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/2e291f35746e94fa62762c7262e78952.png"};
shapenet_2eaab78d6e4c4f2d7b0c85d2effc7e09 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/2eaab78d6e4c4f2d7b0c85d2effc7e09.png"};
shapenet_309674bdec2d24d7597976c675750537 = {'url': "https://s3.amazonaws.com/shapenet-graphical-conventions/309674bdec2d24d7597976c675750537.png"};

_stimList = {
  'diningA' : [
    shapenet_30afd2ef2ed30238aa3d0a2f00b54836['url'],
    shapenet_30dc9d9cfbc01e19950c1f85d919ebc2['url'],
    shapenet_3d7ebe5de86294b3f6bcd046624c43c9['url'],
    shapenet_56262eebe592b085d319c38340319ae4['url']
  ],
  'diningB' : [
    shapenet_4c1777173111f2e380a88936375f2ef4['url'],
    shapenet_3466b6ecd040e252c215f685ba622927['url'],
    shapenet_38f87e02e850d3bd1d5ccc40b510e4bd['url'],
    shapenet_3cf6db91f872d26c222659d33fd79709['url']
  ],
  'waitingA' : [
    shapenet_1d1641362ad5a34ac3bd24f986301745['url'],
    shapenet_1da9942b2ab7082b2ba1fdc12ecb5c9e['url'],
    shapenet_2eaab78d6e4c4f2d7b0c85d2effc7e09['url'],
    shapenet_309674bdec2d24d7597976c675750537['url']
  ],
  'waitingB' : [
    shapenet_2448d9aeda5bb9b0f4b6538438a0b930['url'],
    shapenet_23b0da45f23e5fb4f4b6538438a0b930['url'],
    shapenet_2b5953c986dd08f2f91663a74ccd2338['url'],
    shapenet_2e291f35746e94fa62762c7262e78952['url']
  ]
};

rows = []
for i, _permutation in enumerate(itertools.permutations(range(4))) :
    print('pre shift', _permutation)
    for context_id in _stimList.keys() :
        permutation = list(_permutation)
        permutation_shift = permutation.copy()
        permutation_shift.append(permutation_shift.pop(0))
        successive_pairs = zip(list(permutation), permutation_shift)
        print('shift', permutation_shift)
        print('orig', permutation)
        for j, pair in enumerate(successive_pairs):
            print(pair)
            urls = _stimList[context_id]
            rows.append([i, context_id, j, urls[pair[0]], urls[pair[1]]])

print(rows[0])
df = pd.DataFrame(rows, columns=['permutation_id','context_id','pair_id','url1','url2'])
print(df)
df.to_csv('permutations.csv', index=False)

