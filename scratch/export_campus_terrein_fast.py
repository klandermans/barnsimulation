import bpy
import mathutils
import os

print("=== FAST CAMPUS TERREIN & STRATEN EXPORTER ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
print(f"Loading {fbx_path}...")
bpy.ops.import_scene.fbx(filepath=fbx_path)

terrein_objs = []
to_delete = []

for o in list(bpy.data.objects):
    if o.type != 'MESH':
        to_delete.append(o)
        continue
    n = o.name.lower()
    # Skip Hoofdgebouw (already in hoofdgebouw.glb)
    if 'hoofdgebouw' in n or 'ontwerp' in n or 'logo schaalbaar' in n:
        to_delete.append(o)
        continue
    # Skip the 4 other big barns (they have their own GLBs)
    if ('loods 1' in n or 'schuur 3' in n or 'milk & dairy' in n or
        'dakplaten' in n or 'sandwichpaneel' in n or 'houten gevel' in n or 
        'beton prefab' in n or 'mw 100' in n or 'dynaco' in n or 'springpackage' in n or
        'circular mullion' in n or 'rectangular mullion' in n or 'system panel' in n):
        to_delete.append(o)
        continue
    
    # Skip railings / spijlenhekwerk that cause moire aliasing cocoon
    if 'railing' in n or 'hek' in n or 'spijl' in n:
        to_delete.append(o)
        continue

    # Keep streets, ground, water, silos, utility buildings
    if ('straatwerk' in n or 'grond' in n or 'water' in n or 
        'silo' in n or 'cpac' in n or
        'woning' in n or 'schuur 1' in n or 'schuur 4' in n or 'unit' in n or
        'hok 1' in n or 'model text' in n or 'gebouw tussen' in n):
        terrein_objs.append(o)
    else:
        to_delete.append(o)

print(f"Keeping {len(terrein_objs)} site & street objects. Deleting {len(to_delete)} others...")
for o in to_delete:
    bpy.data.objects.remove(o, do_unlink=True)

# Purge unused mesh data
for block in list(bpy.data.meshes):
    if block.users == 0:
        bpy.data.meshes.remove(block)

# 1. Create clean PBR materials
def make_pbr_mat(name, color, roughness=0.5, metallic=0.1, alpha=1.0):
    mat = bpy.data.materials.new(name=f"Mat_{name}")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if alpha < 1.0 and "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
    return mat

mat_paving = make_pbr_mat("Floors_Paving", (0.24, 0.25, 0.27), 0.85, 0.02) # Modern Dutch asphalt / pavement
mat_ground = make_pbr_mat("Floors_Ground", (0.26, 0.55, 0.20), 0.90, 0.0)  # Lush green pasture
mat_water  = make_pbr_mat("Floors_Water",  (0.12, 0.32, 0.48), 0.15, 0.2, alpha=0.85) # Reflective ditch water
mat_steel  = make_pbr_mat("GalvSteel",     (0.75, 0.78, 0.82), 0.35, 0.85) # Galvanized steel fences
mat_silo   = make_pbr_mat("Silos",         (0.88, 0.90, 0.92), 0.25, 0.80) # Clean silo steel
mat_brick  = make_pbr_mat("Building_House",(0.52, 0.22, 0.15), 0.85, 0.0)  # Dutch brick house
mat_shed   = make_pbr_mat("Building_Sheds_Campus", (0.32, 0.38, 0.35), 0.5, 0.1)

# 2. Adjust elevations to eliminate any z-fighting
for o in terrein_objs:
    n = o.name.lower()
    o.data.materials.clear()
    
    if 'straatwerk' in n:
        o.data.materials.append(mat_paving)
        # Raise street surface slightly above ground
        for v in o.data.vertices:
            v.co.z += 0.12 # Places street top at +0.02m
    elif 'grond' in n:
        o.data.materials.append(mat_ground)
    elif 'water' in n:
        o.data.materials.append(mat_water)
    elif 'railing' in n or 'hek' in n:
        o.data.materials.append(mat_steel)
    elif 'silo' in n or 'cpac' in n:
        o.data.materials.append(mat_silo)
    elif 'woning' in n:
        o.data.materials.append(mat_brick)
    else:
        o.data.materials.append(mat_shed)

# 3. Export to roblox/models/campus_terrein.glb
out_file = '/Users/bert/dev/barnsimulation/roblox/models/campus_terrein.glb'
bpy.ops.object.select_all(action='DESELECT')
for o in terrein_objs:
    o.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=out_file,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_normals=True,
    export_yup=True
)

size_mb = os.path.getsize(out_file) / (1024 * 1024)
print(f"=== SUCCESS! Exported campus_terrein.glb ({size_mb:.2f} MB) with {len(terrein_objs)} site & street meshes ===")
