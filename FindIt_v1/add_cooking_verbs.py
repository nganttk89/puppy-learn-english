import json
import random
import string

def generate_id(prefix):
    return prefix + '_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))

new_topics = [
    {
        "name": "Cooking Verbs",
        "words": ["cut", "chop", "slice", "peel", "dice", "grate", "mix", "stir", "pour", "boil", "fry", "bake", "roast", "grill", "knead", "sprinkle"]
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
    "name": "Cooking Verbs Topic",
    "image": "images/default_avatar.png",
    "questions": new_scene_ids,
    "subScenes": new_sub_scenes
}

zones.append(new_zone)

with open('data/zones.json', 'w', encoding='utf-8') as f:
    json.dump(zones, f, indent=4, ensure_ascii=False)

print("Added successfully!")
