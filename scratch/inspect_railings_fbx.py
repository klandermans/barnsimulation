import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

railings = [o for o in bpy.data.objects if o.type == 'MESH' and 'railing' in o.name.lower()]
print(f"Total railing objects in FBX: {len(railings)}")
if railings:
    all_bb = []
    for o in railings:
        bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
        all_bb.extend(bb)
    min_x = min(v.x for v in all_bb)
    max_x = max(v.x for v in all_bb)
    min_y = min(v.y for v in all_bb)
    max_y = max(v.y for v in all_bb)
    min_z = min(v.z for v in all_bb)
    max_z = max(v.z for v in all_bb)
    print(f"Railings bounds: X[{min_x:.1f} .. {max_x:.1f}], Y[{min_y:.1f} .. {max_y:.1f}], Z[{min_z:.1f} .. {max_z:.1f}]")
    print("Sample railing objects:")
    for o in railings[:10]:
        print(f"  {o.name}: loc={o.location}")
