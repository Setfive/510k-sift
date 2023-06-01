#!/usr/bin/env python3
import sys
import os.path
from sentence_transformers import SentenceTransformer
from pathlib import Path
import json

path = sys.argv[1]
if os.path.isfile(path) == False:
    print(path + " does not exist!")
    sys.exit(-1)

content = Path(path).read_text()
sentences = [content]

model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
embeddings = model.encode(sentences)
result = embeddings[0].tolist()

print(json.dumps(result))
