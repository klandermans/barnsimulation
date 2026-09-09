import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/Users/bert/dev/barnsimulation/roblox/models/hoofdgebouw.glb')

print("--- OBJECTS IN HOOFDGEBOUW.GLB ---")
for o in bpy.data.objects:
    print(f"Object: {o.name}, type: {o.type}")
    if o.type == 'MESH':
        mats = [m.name for m in o.data.materials if m]
        print(f"  Materials: {mats}")
        bb = [o.matrix_world @ o.bound_box[i] for i in range(8)]
        print(f"  X: [{min(v.x for v in bb):.2f} .. {max(v.x for v in bb):.2f}]")
        print(f"  Y: [{min(v.y for v in bb):.2f} .. {max(v.y for v in bb):.2f}]")
        print(f"  Z: [{min(v.z for v in bb):.2f} .. {max(v.z for v in bb):.2f}]")
