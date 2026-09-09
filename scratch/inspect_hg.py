import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

print("--- ALL OBJECTS IN HOOFDGEBOUW AREA ---")
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
    min_x = min(v.x for v in bb)
    max_x = max(v.x for v in bb)
    min_y = min(v.y for v in bb)
    max_y = max(v.y for v in bb)
    min_z = min(v.z for v in bb)
    max_z = max(v.z for v in bb)
    cx = (min_x + max_x) / 2
    cy = (min_y + max_y) / 2
    cz = (min_z + max_z) / 2
    
    # Check if in hoofdgebouw range
    if ('hoofdgebouw' in o.name.lower() or 
        (-40 <= cx <= 35 and -55 <= cy <= -10)):
        print(f"Name: {o.name}")
        print(f"  Center: ({cx:.2f}, {cy:.2f}, {cz:.2f})")
        print(f"  Bounds X: [{min_x:.2f} .. {max_x:.2f}], Y: [{min_y:.2f} .. {max_y:.2f}], Z: [{min_z:.2f} .. {max_z:.2f}]")
        print(f"  Verts: {len(o.data.vertices)}, Faces: {len(o.data.polygons)}")
        mats = [m.name for m in o.data.materials if m]
        print(f"  Materials: {mats}")
