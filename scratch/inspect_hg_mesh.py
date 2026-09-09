import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

hg = bpy.data.objects.get('hoofdgebouw hoofdgebouw [5691032]')
if hg:
    print(f"Name: {hg.name}")
    print(f"Total vertices: {len(hg.data.vertices)}")
    print(f"Total polygons: {len(hg.data.polygons)}")
    # Print distinct Z levels
    z_coords = sorted(list(set(round(v.co.z, 2) for v in hg.data.vertices)))
    print(f"Distinct Z levels: {z_coords}")
    # Print face normals
    normals = set((round(p.normal.x, 2), round(p.normal.y, 2), round(p.normal.z, 2)) for p in hg.data.polygons)
    print(f"Normals: {normals}")
