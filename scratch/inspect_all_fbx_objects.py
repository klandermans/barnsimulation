import bpy
import collections

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

categories = collections.defaultdict(list)

for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    n = o.name
    # Group by Revit category prefix or keywords
    prefix = n.split()[0] if ' ' in n else n[:15]
    categories[prefix].append(o)

print(f"Total mesh objects: {len(bpy.data.objects)}")
print("\nObject types / prefixes:")
for p, objs in sorted(categories.items(), key=lambda x: len(x[1]), reverse=True):
    print(f"  {p:<30}: {len(objs):>4} objects (e.g. '{objs[0].name}')")

print("\n--- ALL STREET / TERRAIN / INRICHTING OBJECTS ---")
terrain_keywords = ['straat', 'asfalt', 'klinker', 'weg', 'pad', 'parkeer', 'stoep', 'trottoir', 'inrichting', 'terrein', 'site', 'bomen', 'boom', 'plant', 'haag', 'hek', 'railing', 'verlichting', 'lamp', 'paal', 'bord', 'bank', 'gras', 'water', 'silo', 'verharding']

found_terrain = []
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    nl = o.name.lower()
    for kw in terrain_keywords:
        if kw in nl:
            found_terrain.append((kw, o))
            break

by_kw = collections.defaultdict(list)
for kw, o in found_terrain:
    by_kw[kw].append(o.name)

for kw, names in sorted(by_kw.items(), key=lambda x: len(x[1]), reverse=True):
    print(f"\nKeyword '{kw}' ({len(names)} objects):")
    for name in names[:15]:
        print(f"   - {name}")
    if len(names) > 15:
        print(f"   ... and {len(names)-15} more")
