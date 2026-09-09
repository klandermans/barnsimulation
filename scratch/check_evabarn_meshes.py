import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/Users/bert/dev/barnsimulation/roblox/models/evabarn.glb')

hg_in_eva = []
for o in bpy.data.objects:
    if o.type == 'MESH':
        n = o.name.lower()
        if 'ontwerp' in n or 'hoofdgebouw' in n or 'logo schaalbaar' in n:
            hg_in_eva.append(o.name)

print(f"Found {len(hg_in_eva)} Hoofdgebouw meshes inside evabarn: {hg_in_eva}")
