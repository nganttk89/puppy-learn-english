import json
import os

filepath = 'data/data.json'

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

vocab_list = [
    {"id": "sofa", "name": "sofa", "text": "Where is the sofa?"},
    {"id": "television", "name": "TV / television", "text": "Where is the TV?"},
    {"id": "fan", "name": "fan", "text": "Where is the fan?"},
    {"id": "air_conditioner", "name": "air conditioner", "text": "Where is the air conditioner?"},
    {"id": "coffee_table", "name": "coffee table", "text": "Where is the coffee table?"},
    {"id": "chair", "name": "chair", "text": "Where is the chair?"},
    {"id": "rug", "name": "carpet / rug", "text": "Where is the rug?"},
    {"id": "curtain", "name": "curtain", "text": "Where is the curtain?"},
    {"id": "window", "name": "window", "text": "Where is the window?"},
    {"id": "door", "name": "door", "text": "Where is the door?"},
    {"id": "lamp", "name": "lamp", "text": "Where is the lamp?"},
    {"id": "clock", "name": "clock", "text": "Where is the clock?"},
    {"id": "picture", "name": "picture", "text": "Where is the picture?"},
    {"id": "bookshelf", "name": "bookshelf", "text": "Where is the bookshelf?"},
    {"id": "book", "name": "book", "text": "Where is the book?"},
    {"id": "remote_control", "name": "remote control", "text": "Where is the remote control?"},
    {"id": "plant", "name": "plant", "text": "Where is the plant?"},
    {"id": "vase", "name": "vase", "text": "Where is the vase?"},
    {"id": "cushion", "name": "cushion", "text": "Where is the cushion?"},
    {"id": "ceiling_light", "name": "ceiling light", "text": "Where is the ceiling light?"}
]

for scene in data:
    if scene.get("id") == "scene_living_room":
        scene["subQuestions"] = [{"text": v["text"], "answer": v["id"]} for v in vocab_list]
        
        # We will generate placeholder coordinates for the objects
        # The user will move them in the admin panel anyway.
        # Let's arrange them in a simple grid
        objects = []
        for i, v in enumerate(vocab_list):
            row = i // 5
            col = i % 5
            objects.append({
                "id": v["id"],
                "name": v["name"],
                "x": col * 150 + 50,
                "y": row * 150 + 50,
                "width": 100,
                "height": 100
            })
        scene["objects"] = objects
        break

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print("Updated scene_living_room successfully!")
