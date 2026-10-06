import json
import random
import string
import time

def generate_id(prefix):
    return prefix + '_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

new_topics = [
    {
        "name": "Materials",
        "words": ["wood", "plastic", "metal", "glass", "paper", "gold", "silver", "wool", "cotton", "leather"]
    },
    {
        "name": "Space & Universe",
        "words": ["planet", "star", "moon", "astronaut", "spaceship", "rocket", "satellite", "earth", "alien", "comet"]
    },
    {
        "name": "Health & Illness",
        "words": ["headache", "stomach ache", "cold", "cough", "temperature", "medicine", "hospital", "bandage", "dentist", "pharmacy"]
    },
    {
        "name": "Environment",
        "words": ["pollution", "recycle", "environment", "wildlife", "forest", "ocean", "factory", "rubbish", "plastic bag", "solar energy"]
    },
    {
        "name": "In the City",
        "words": ["museum", "police station", "post office", "fire station", "airport", "stadium", "theatre", "castle", "bridge", "roundabout"]
    },
    {
        "name": "Technology",
        "words": ["internet", "website", "email", "laptop", "screen", "keyboard", "message", "password", "download", "smartphone"]
    },
    {
        "name": "Sentences: Space",
        "words": ["The earth is a planet", "Astronauts travel in spaceships", "Look at the stars", "The moon is bright tonight"],
        "disableSpelling": True
    },
    {
        "name": "Sentences: Health",
        "words": ["I have a bad headache", "You should take some medicine", "He is coughing a lot", "She went to the hospital"],
        "disableSpelling": True
    },
    {
        "name": "Sentences: Environment",
        "words": ["We must recycle plastic", "Don't throw rubbish in the ocean", "Factories cause pollution", "Protect the wildlife"],
        "disableSpelling": True
    },
    {
        "name": "Sentences: City",
        "words": ["The museum is very big", "We went to the stadium", "Send a letter at the post office", "The castle is on a hill"],
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
        "difficulty": "Medium",
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
    "name": "A2 Expansion",
    "image": "images/default_avatar.png",
    "questions": new_scene_ids,
    "subScenes": new_sub_scenes
}

zones.append(new_zone)

with open('data/zones.json', 'w', encoding='utf-8') as f:
    json.dump(zones, f, indent=4, ensure_ascii=False)

print("A2 Topics added successfully!")
