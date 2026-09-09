import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/Users/bert/dev/barnsimulation/roblox/models/campus_terrein.glb')

for o in bpy.data.objects:
    if o.type == 'MESH':
        bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
        min_y = min(v.y for v in bb) # Y is UP in glTF
        max_y = max(v.y for v in bb)
        if 'straatwerk' in o.name.lower() or 'grond' in o.name.lower():
            print(f"'{o.name}': Y=[{min_y:.3f} .. {max_y:.3f}]")
