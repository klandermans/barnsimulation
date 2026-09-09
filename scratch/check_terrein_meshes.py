import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/Users/bert/dev/barnsimulation/roblox/models/campus_terrein.glb')

print("Meshes in campus_terrein.glb:")
hg_in_terrein = []
for o in bpy.data.objects:
    if o.type == 'MESH':
        n = o.name.lower()
        if 'ontwerp' in n or 'hoofdgebouw' in n or 'logo schaalbaar' in n:
            hg_in_terrein.append(o.name)

print(f"Found {len(hg_in_terrein)} Hoofdgebouw meshes inside campus_terrein: {hg_in_terrein}")
