import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
bpy.ops.import_scene.fbx(filepath=fbx_path)

print("=== INSPECTING BARN WALLS & STRUCTURE ===")
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    n = o.name.lower()
    if any(k in n for k in ['sandwichpaneel', 'beton prefab', 'geveldelen', 'mw 100', 'dakplaten']):
        bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
        min_x = min(v.x for v in bb)
        max_x = max(v.x for v in bb)
        min_y = min(v.y for v in bb)
        max_y = max(v.y for v in bb)
        min_z = min(v.z for v in bb)
        max_z = max(v.z for v in bb)
        # Filter for the main barn (Y between 0 and 170)
        if 0 < max_y and min_y < 170 and -10 < min_x and max_x < 60:
            print(f"{o.name[:40]:<40} | X:[{min_x:5.1f}..{max_x:5.1f}] Y:[{min_y:5.1f}..{max_y:5.1f}] Z:[{min_z:4.1f}..{max_z:4.1f}]")
