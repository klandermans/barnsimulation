import bpy
import collections

bpy.ops.wm.read_factory_settings(use_empty=True)
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
bpy.ops.import_scene.fbx(filepath=fbx_path)
mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"TOTAL MESHES: {len(mesh_objs)}")

categories = collections.defaultdict(list)
for o in mesh_objs:
    n = o.name
    cat = n.split(' [')[0] if ' [' in n else n.split()[0]
    categories[cat].append((o.name, len(o.data.polygons)))

for cat, lst in sorted(categories.items(), key=lambda x: -len(x[1])):
    total_polys = sum(p for _, p in lst)
    print(f"CATEGORY: {cat} | Count: {len(lst)} | Total Polys: {total_polys}")
    for name, poly in lst[:3]:
        print(f"   - {name} ({poly} polys)")
