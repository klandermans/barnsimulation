import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

objs = []
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    bb = [o.matrix_world @ mathutils.Vector(corner) for corner in o.bound_box]
    min_x, max_x = min(v.x for v in bb), max(v.x for v in bb)
    min_y, max_y = min(v.y for v in bb), max(v.y for v in bb)
    min_z, max_z = min(v.z for v in bb), max(v.z for v in bb)
    
    if max_x >= -40 and min_x <= 35 and max_y >= -55 and min_y <= -1:
        is_terrain = (max_x - min_x > 100 or max_y - min_y > 100)
        objs.append((o.name, min_x, max_x, min_y, max_y, min_z, max_z, len(o.data.vertices), len(o.data.polygons), is_terrain))

objs.sort(key=lambda x: x[3])
for name, min_x, max_x, min_y, max_y, min_z, max_z, nv, nf, is_terrain in objs:
    print(f"[{'TERRAIN' if is_terrain else 'BUILDING'}] {name}")
    print(f"    X:[{min_x:.1f} .. {max_x:.1f}] Y:[{min_y:.1f} .. {max_y:.1f}] Z:[{min_z:.1f} .. {max_z:.1f}] V:{nv} F:{nf}")
