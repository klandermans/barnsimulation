import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

streets = [o for o in bpy.data.objects if o.type == 'MESH' and 'straatwerk' in o.name.lower()]
print(f"Total straatwerk meshes: {len(streets)}")
for o in streets:
    bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
    min_x = min(v.x for v in bb)
    max_x = max(v.x for v in bb)
    min_y = min(v.y for v in bb)
    max_y = max(v.y for v in bb)
    min_z = min(v.z for v in bb)
    max_z = max(v.z for v in bb)
    print(f"Street '{o.name}': X[{min_x:.1f} .. {max_x:.1f}], Y[{min_y:.1f} .. {max_y:.1f}], Z[{min_z:.2f} .. {max_z:.2f}], Verts={len(o.data.vertices)}")
