import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

hg = bpy.data.objects.get('hoofdgebouw hoofdgebouw [5691032]')
if hg:
    # Check normals in world space
    roof_faces = []
    wall_faces = []
    ground_faces = []
    for i, p in enumerate(hg.data.polygons):
        # Calculate world normal
        wn = hg.matrix_world.to_3x3() @ p.normal
        wn.normalize()
        if wn.z > 0.15:
            roof_faces.append(i)
        elif wn.z < -0.15:
            ground_faces.append(i)
        else:
            wall_faces.append(i)
    print(f"Hoofdgebouw faces: roof={len(roof_faces)}, walls={len(wall_faces)}, ground={len(ground_faces)}")
