import bpy
import mathutils
import os

print("=== FAST HOOFDGEBOUW EXPORTER ===")
bpy.ops.wm.read_factory_settings(use_empty=True)
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
print(f"Loading {fbx_path}...")
bpy.ops.import_scene.fbx(filepath=fbx_path)

# Hoofdgebouw zone in FBX space: X=[-24.3,15.9] Y=[-41.9,-18.7]
# Include everything structural in that zone (with 15m margin to capture wings)
# SKIP: straatwerk, grond, water, railings, mullions, stairs
ZONE_X1, ZONE_X2 = -28, 35
ZONE_Y1, ZONE_Y2 = -50, -4

SKIP_KEYWORDS = ["straatwerk", "grond", "water", "nlrs_23_fl", "circular mullion",
                 "rectangular mullion", "system panel", "railing", "stringer",
                 "assembled stair", "non-monolithic", "springpackage", "gutter",
                 "fascia", "nlrs_31", "evabarn", "melkstal", "voedingsstal",
                 "milieustal", "schuur", "loods", "woning"]

hg_objs = []
to_delete = []

for o in list(bpy.data.objects):
    if o.type != 'MESH':
        to_delete.append(o)
        continue
    n = o.name.lower()
    
    # Skip unwanted object types
    if any(k in n for k in SKIP_KEYWORDS):
        to_delete.append(o)
        continue
    
    # Calculate bounding box center
    bbox = [o.matrix_world @ mathutils.Vector(c) for c in o.bound_box]
    xmin = min(v.x for v in bbox)
    xmax = max(v.x for v in bbox)
    ymin = min(v.y for v in bbox)
    ymax = max(v.y for v in bbox)
    
    # Check if bbox overlaps the hoofdgebouw zone
    if xmax < ZONE_X1 or xmin > ZONE_X2 or ymax < ZONE_Y1 or ymin > ZONE_Y2:
        to_delete.append(o)
        continue
    
    hg_objs.append(o)
    print(f"  KEEP: {o.name[:70]} center=({(xmin+xmax)/2:.1f},{(ymin+ymax)/2:.1f})")


print(f"Hoofdgebouw objects found: {len(hg_objs)}. Deleting {len(to_delete)} others...")
bpy.ops.object.select_all(action='DESELECT')
for o in to_delete:
    bpy.data.objects.remove(o, do_unlink=True)

# Purge unused mesh datablocks to free RAM
for block in list(bpy.data.meshes):
    if block.users == 0:
        bpy.data.meshes.remove(block)

# 1. Create clean PBR materials
def make_pbr_mat(name, color, roughness=0.4, metallic=0.1):
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
    return mat

mat_facade = make_pbr_mat("Building_Main", (0.92, 0.94, 0.96), 0.35, 0.05)
mat_roof = make_pbr_mat("Roofs", (0.18, 0.20, 0.24), 0.45, 0.20)
mat_logo = make_pbr_mat("Campus_Logo", (0.01, 0.28, 0.65), 0.25, 0.40)

# 2. Assign materials faithfully to Revit contours
hg_main = bpy.data.objects.get('hoofdgebouw hoofdgebouw [5691032]')
if hg_main:
    hg_main.data.materials.clear()
    hg_main.data.materials.append(mat_facade) # Slot 0: Facade walls
    hg_main.data.materials.append(mat_roof)    # Slot 1: Roof pitches
    rot_mat = hg_main.matrix_world.to_3x3()
    for p in hg_main.data.polygons:
        wn = rot_mat @ p.normal
        wn.normalize()
        if wn.z > 0.15:
            p.material_index = 1 # Roof
        else:
            p.material_index = 0 # Walls & floor
    print(f"hoofdgebouw [5691032] materials assigned: Slot 0 Facade, Slot 1 Roof")

logo_obj = bpy.data.objects.get('DAIRY CAMPUS LOGO SCHAALBAAR LOGO SCHAALBAAR [5929266]')
if logo_obj:
    logo_obj.data.materials.clear()
    logo_obj.data.materials.append(mat_logo)
    print("Dairy Campus logo assigned royal blue PBR material")

for o in hg_objs:
    if o == hg_main or o == logo_obj:
        continue
    n = o.name.lower()
    o.data.materials.clear()
    if 'ontwerpdak' in n or 'ontwerp ihwg' in n or 'roof' in n or 'dak' in n:
        o.data.materials.append(mat_roof)
    else:
        o.data.materials.append(mat_facade)

# 3. Export to roblox/models/hoofdgebouw.glb
out_file = '/Users/bert/dev/barnsimulation/roblox/models/hoofdgebouw.glb'
bpy.ops.object.select_all(action='DESELECT')
for o in hg_objs:
    o.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=out_file,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_normals=True,
    export_yup=True
)

size_kb = os.path.getsize(out_file) / 1024
print(f"=== SUCCESS! Exported hoofdgebouw.glb ({size_kb:.1f} KB) with {len(hg_objs)} meshes ===")
