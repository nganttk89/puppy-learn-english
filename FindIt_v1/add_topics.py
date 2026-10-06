import json
import random
import string
import time

def generate_id(prefix):
    return prefix + '_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

new_topics = [
    {
        "name": "Body Parts",
        "words": ["head", "shoulder", "arm", "hand", "finger", "leg", "foot", "toe", "back", "stomach"]
    },
    {
        "name": "Face Parts",
        "words": ["eye", "ear", "nose", "mouth", "face", "hair", "tooth", "teeth"]
    },
    {
        "name": "Jobs & Professions",
        "words": ["teacher", "doctor", "nurse", "police officer", "farmer", "pilot", "driver", "singer", "student", "dentist"]
    },
    {
        "name": "Feelings & Emotions",
        "words": ["happy", "sad", "angry", "scared", "tired", "hungry", "thirsty", "bored", "excited", "surprised"]
    },
    {
        "name": "Hobbies",
        "words": ["reading", "swimming", "singing", "dancing", "playing football", "listening to music", "watching TV", "painting", "drawing"]
    },
    {
        "name": "Colors",
        "words": ["red", "blue", "green", "yellow", "black", "white", "orange", "pink", "purple", "brown", "grey"]
    },
    {
        "name": "Shapes",
        "words": ["circle", "square", "triangle", "star", "rectangle", "heart"]
    },
    {
        "name": "Opposites",
        "words": ["big", "small", "long", "short", "fast", "slow", "hot", "cold", "clean", "dirty", "beautiful", "ugly"]
    },
    {
        "name": "Sentences: Body",
        "words": ["I have two eyes", "Touch your nose", "Wash your hands", "Brush your hair"],
        "disableSpelling": True
    },
    {
        "name": "Sentences: Jobs",
        "words": ["My mom is a teacher", "He is a doctor", "I want to be a pilot", "She works in a hospital"],
        "disableSpelling": True
    },
    {
        "name": "Sentences: Feelings",
        "words": ["I am happy today", "Are you hungry?", "He is very tired", "Don't be sad"],
        "disableSpelling": True
    },
    {
        "name": "Sentences: Hobbies",
        "words": ["I like reading books", "She loves dancing", "Do you like playing football?", "Let's watch TV"],
        "disableSpelling": True
    }
]

# 1. Update scenes.json
with open('data/scenes.json', 'r', encoding='utf-8') as f:
    scenes = json.load(f)

new_scene_ids = []
new_sub_scenes = []

for topic in new_topics:
    scene_id = generate_id('scene')
    new_scene_ids.append(scene_id)
    
    objects = []
    for word in topic["words"]:
        objects.append({
            "id": generate_id('obj'),
            "name": word,
            "image": "",
            "x": 0, "y": 0, "width": 0, "height": 0
        })
        
    scene_obj = {
        "id": scene_id,
        "name": topic["name"],
        "type": "lesson",
        "questionSetId": "none",
        "disableSpelling": topic.get("disableSpelling", False),
        "thumbnail": "images/default_avatar.png",
        "image": "",
        "objects": objects
    }
    scenes.append(scene_obj)
    
    new_sub_scenes.append({
        "id": "level_" + scene_id,
        "name": topic["name"],
        "difficulty": "Easy",
        "type": "lesson",
        "disableSpelling": topic.get("disableSpelling", False),
        "image": "images/default_avatar.png",
        "questions": [scene_id]
    })

with open('data/scenes.json', 'w', encoding='utf-8') as f:
    json.dump(scenes, f, indent=4, ensure_ascii=False)


# 2. Update zones.json
with open('data/zones.json', 'r', encoding='utf-8') as f:
    zones = json.load(f)

new_zone = {
    "id": generate_id('lvl'),
    "name": "A1 Expansion",
    "image": "images/default_avatar.png",
    "questions": new_scene_ids,
    "subScenes": new_sub_scenes
}

zones.append(new_zone)

with open('data/zones.json', 'w', encoding='utf-8') as f:
    json.dump(zones, f, indent=4, ensure_ascii=False)

print("Added successfully!")
