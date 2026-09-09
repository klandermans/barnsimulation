import bpy
import mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

hg = bpy.data.objects.get('hoofdgebouw hoofdgebouw [5691032]')
if hg:
    print(f"Matrix world: {hg.matrix_world}")
    world_verts = [hg.matrix_world @ v.co for v in hg.data.vertices]
    min_x = min(v.x for v in world_verts)
    max_x = max(v.x for v in world_verts)
    min_y = min(v.y for v in world_verts)
    max_y = max(v.y for v in world_verts)
    min_z = min(v.z for v in world_verts)
    max_z = max(v.z for v in world_verts)
    print(f"World bounds: X[{min_x:.2f} .. {max_x:.2f}], Y[{min_y:.2f} .. {max_y:.2f}], Z[{min_z:.2f} .. {max_z:.2f}]")
    print(f"Polygons count: {len(hg.data.polygons)}")
    for i, p in enumerate(hg.data.polygons):
        pv = [world_verts[vi] for vi in p.vertices]
        center = sum(pv, mathutils.Vector((0,0,0))) / len(pv)
        normal = hg.matrix_world.to_3x3() @ p.normal
        print(f"Poly {i}: center=({center.x:.1f}, {center.y:.1f}, {center.z:.1f}), normal=({normal.x:.2f}, {normal.y:.2f}, {normal.z:.2f}), verts={len(pv)}")
