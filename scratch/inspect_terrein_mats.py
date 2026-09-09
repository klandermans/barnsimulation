import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/Users/bert/dev/barnsimulation/roblox/models/campus_terrein.glb')

print("Materials on meshes in campus_terrein.glb:")
for o in bpy.data.objects:
    if o.type == 'MESH':
        mats = [m.name for m in o.data.materials if m]
        print(f"Mesh '{o.name[:35]}': mats={mats}")
