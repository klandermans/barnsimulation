import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

print("--- DETAILED HOOFDGEBOUW GEOMETRY IN FBX ---")
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    if 'hoofdgebouw' in o.name.lower() or 'ontwerp' in o.name.lower():
        bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
        min_x, max_x = min(v.x for v in bb), max(v.x for v in bb)
        min_y, max_y = min(v.y for v in bb), max(v.y for v in bb)
        min_z, max_z = min(v.z for v in bb), max(v.z for v in bb)
        print(f"\nObject: '{o.name}'")
        print(f"  Bounds: X[{min_x:.2f} .. {max_x:.2f}], Y[{min_y:.2f} .. {max_y:.2f}], Z[{min_z:.2f} .. {max_z:.2f}]")
        print(f"  Dimensions: ({max_x-min_x:.2f}, {max_y-min_y:.2f}, {max_z-min_z:.2f})")
        # Polygons normals sample
        normals = [p.normal for p in o.data.polygons[:5]]
        print(f"  Sample normals: {[(round(n.x, 2), round(n.y, 2), round(n.z, 2)) for n in normals]}")
