import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
bpy.ops.import_scene.fbx(filepath=fbx_path)

CATEGORIES = {
    'Roofs': ['dakplaten', 'Roof', 'dak', 'ontwerpdak', 'isolatie PIR', 'boeiboord', 'goot'],
    'Walls_Wood': ['houten geveldelen', 'geveldelen'],
    'Walls_Sandwich': ['sandwichpaneel', 'ontwerpwand'],
    'Walls_Brick': ['mw 100', 'metselwerk'],
    'Walls_Concrete': ['beton prefab', 'prefab 110'],
    'Floors_Water': ['water'],
    'Floors_Ground': ['grond', 'gras', 'weide'],
    'Floors_Paving': ['straatwerk', 'asfalt', 'klinkers'],
    'Floors_Concrete': ['beton ihwg', 'vloer', 'floor'],
    'Doors_Industrial': ['IndustrialDoor', 'DYNACO', 'sectional-overhead-doo', 'overhead', 'SpringPackage'],
    'Railings': ['spijlenhekwerk', 'Railing', 'hek'],
    'Silos': ['Silo', 'Tank', 'CPAC'],
    'Glass': ['glas 24mm', 'paneel glas'],
    'Mullions': ['Circular Mullion', 'Mullion', 'kozijn', 'gesloten paneel'],
    'Stairs_Structure': ['Stair', 'Trap', 'kolom', 'spant']
}

unclassified = []
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    n = o.name.lower()
    matched = False
    for cat, kws in CATEGORIES.items():
        if any(kw.lower() in n for kw in kws):
            matched = True
            break
    if not matched:
        bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
        min_x = min(v.x for v in bb)
        max_x = max(v.x for v in bb)
        min_y = min(v.y for v in bb)
        max_y = max(v.y for v in bb)
        min_z = min(v.z for v in bb)
        max_z = max(v.z for v in bb)
        unclassified.append((o.name, len(o.data.polygons), min_x, max_x, min_y, max_y, min_z, max_z))

print(f"Total unclassified objects: {len(unclassified)}")
for name, polys, min_x, max_x, min_y, max_y, min_z, max_z in unclassified:
    print(f"{name:<50} | polys:{polys:5d} | X:[{min_x:6.1f}..{max_x:6.1f}] Y:[{min_y:6.1f}..{max_y:6.1f}] Z:[{min_z:5.2f}..{max_z:5.2f}]")

