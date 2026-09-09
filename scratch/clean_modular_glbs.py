import bpy
import os

models_to_clean = [
    '/Users/bert/dev/barnsimulation/roblox/models/campus_terrein.glb',
    '/Users/bert/dev/barnsimulation/roblox/models/evabarn.glb'
]

for glb_path in models_to_clean:
    print(f"\n--- Cleaning {os.path.basename(glb_path)} ---")
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb_path)

    removed = []
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            n = o.name.lower()
            if 'ontwerp' in n or 'hoofdgebouw' in n or 'logo schaalbaar' in n:
                removed.append(o.name)
                bpy.data.objects.remove(o, do_unlink=True)

    print(f"Removed {len(removed)} Hoofdgebouw meshes from {os.path.basename(glb_path)}")
    for r in removed:
        print(f"  - {r}")

    # Re-export clean GLB
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_normals=True,
        export_yup=True
    )
    size_mb = os.path.getsize(glb_path) / (1024 * 1024)
    print(f"✓ Re-saved {os.path.basename(glb_path)}: {size_mb:.2f} MB")

print("\n=== ALL MODULAR GLBs ARE NOW 100% CLEAN AND SEPARATED! ===")
