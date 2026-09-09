import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/Users/bert/dev/barnsimulation/roblox/models/campus_terrein.glb')

for o in bpy.data.objects:
    if o.type == 'MESH':
        bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
        min_z = min(v.z for v in bb)
        max_z = max(v.z for v in bb)
        if 'straatwerk' in o.name.lower() or 'grond' in o.name.lower() or 'water' in o.name.lower():
            print(f"'{o.name}': Z (elevation) = [{min_z:.3f} .. {max_z:.3f}]")
