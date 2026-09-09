import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

print("All non-wall/non-roof/non-floor objects in FBX:")
skipped = ['basic wall', 'basic roof', 'floor', 'system panel', 'mullion', 'dynaco', 'springpackage']

site_objs = []
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    nl = o.name.lower()
    if not any(s in nl for s in skipped):
        site_objs.append(o)

print(f"Total site/furnishing objects: {len(site_objs)}")
for o in site_objs:
    print(f"  - '{o.name}' (verts={len(o.data.vertices)}, faces={len(o.data.polygons)})")
