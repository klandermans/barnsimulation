import bpy
import mathutils

for name in ['cow_eating.glb', 'cow_lying.glb', 'cow_walk.glb', 'cow.glb']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f'/Users/bert/dev/iter8/finallly/realtime/models/{name}')
    objs = [o for o in bpy.data.objects if o.type == 'MESH']
    for o in objs:
        bb = [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
        sx = max(v.x for v in bb) - min(v.x for v in bb)
        sy = max(v.y for v in bb) - min(v.y for v in bb)
        sz = max(v.z for v in bb) - min(v.z for v in bb)
        print(f"{name:<16} | Mesh: {o.name:<18} | Dimensions: X={sx:.2f}m, Y={sy:.2f}m, Z={sz:.2f}m")
