import json

def migrate_data():
    try:
        with open('data/data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        changed = False
        for q in data:
            if q.get('type') == 'routine':
                q['type'] = 'quiz'
                changed = True
            if 'routineData' in q:
                q['quizData'] = q['routineData']
                del q['routineData']
                changed = True
                
        if changed:
            with open('data/data.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            print("data.json migrated successfully.")
            
        with open('data/levels.json', 'r', encoding='utf-8') as f:
            levels = json.load(f)
            
        changed_levels = False
        for lvl in levels:
            if lvl.get('type') == 'routine':
                lvl['type'] = 'quiz'
                changed_levels = True
            if 'subLevels' in lvl:
                for sub in lvl['subLevels']:
                    if sub.get('type') == 'routine':
                        sub['type'] = 'quiz'
                        changed_levels = True
                        
        if changed_levels:
            with open('data/levels.json', 'w', encoding='utf-8') as f:
                json.dump(levels, f, indent=4, ensure_ascii=False)
            print("levels.json migrated successfully.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    migrate_data()
