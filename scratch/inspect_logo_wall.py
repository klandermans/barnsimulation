import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/Users/bert/dev/barnsimulation/roblox/models/hoofdgebouw.glb')

print("Objects in hoofdgebouw.glb:")
for o in bpy.data.objects:
    if o.type == 'MESH':
        bb = [o.matrix_world @ o.bound_box[i] for i in range(8)]
        min_x = min(v.x for v in bb)
        max_x = max(v.x for v in bb)
        min_y = min(v.y for v in bb)
        max_y = max(v.y for v in bb)
        min_z = min(v.z for v in bb)
        max_z = max(v.z for v in bb)
        print(f"{o.name}: X[{min_x:.1f} .. {max_x:.1f}] Y[{min_y:.1f} .. {max_y:.1f}] Z[{min_z:.1f} .. {max_z:.1f}]")
