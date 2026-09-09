import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

hg = bpy.data.objects.get('hoofdgebouw hoofdgebouw [5691032]')
if hg:
    print(f"UV layers on {hg.name}: {len(hg.data.uv_layers)}")
    for uv in hg.data.uv_layers:
        print(f"  UV layer: {uv.name}")
        # print some sample UVs
        sample_uvs = [d.uv for d in uv.data[:10]]
        print(f"  Sample UVs: {[(round(u[0], 2), round(u[1], 2)) for u in sample_uvs]}")

# Also check ontwerp objects
for o in bpy.data.objects:
    if 'ontwerp' in o.name.lower() or 'logo schaalbaar' in o.name.lower():
        print(f"UV layers on {o.name}: {len(o.data.uv_layers)}")
