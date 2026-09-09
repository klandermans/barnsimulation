import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
bpy.ops.import_scene.fbx(filepath=fbx_path)

for o in bpy.data.objects:
    if 'straatwerk' in o.name.lower() or 'grond' in o.name.lower() or 'woning' in o.name.lower() or 'hoofdgebouw' in o.name.lower():
        bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
        min_x = min(v.x for v in bb)
        max_x = max(v.x for v in bb)
        min_y = min(v.y for v in bb)
        max_y = max(v.y for v in bb)
        min_z = min(v.z for v in bb)
        max_z = max(v.z for v in bb)
        print(f"{o.name[:35]:<35} | X:[{min_x:6.1f}..{max_x:6.1f}] Y:[{min_y:6.1f}..{max_y:6.1f}] Z:[{min_z:6.2f}..{max_z:6.2f}]")

