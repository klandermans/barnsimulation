import bpy
import glob

for glb in glob.glob('/Users/bert/dev/barnsimulation/roblox/models/*.glb'):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    railings = [o.name for o in bpy.data.objects if o.type == 'MESH' and 'railing' in o.name.lower()]
    if railings:
        print(f"{glb}: has {len(railings)} railings")
