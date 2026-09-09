import bpy
import mathutils
import os
import math

print("=============================================================")
print("=== DAIRY CAMPUS: GENERATE 6 MODULAR GLB BUILDINGS ===")
print("=============================================================")

# 1. Reset scene and import Revit FBX
bpy.ops.wm.read_factory_settings(use_empty=True)
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
print(f"Importing {fbx_path}...")
bpy.ops.import_scene.fbx(filepath=fbx_path)

mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"Imported {len(mesh_objs)} meshes from FBX")

# Architectural category definitions
CATEGORIES = {
    'Roofs': ['dakplaten', 'Roof', 'dak', 'ontwerpdak', 'ontwerp ihwg', 'isolatie PIR', 'boeiboord'],
    'Gutters': ['goot rond'],
    'Walls_Wood': ['houten geveldelen', 'geveldelen'],
    'Walls_Sandwich': ['sandwichpaneel', 'ontwerpwand'],
    'Walls_Brick': ['mw 100', 'metselwerk'],
    'Walls_Concrete': ['beton prefab', 'prefab 110'],
    'Floors_Water': ['water'],
    'Floors_Ground': ['grond', 'gras', 'weide'],
    'Floors_Paving': ['straatwerk', 'asfalt', 'klinkers'],
    'Floors_Concrete': ['beton ihwg', 'vloer', 'floor'],
    'Doors_Industrial': ['IndustrialDoor', 'DYNACO', 'sectional-overhead-doo', 'overhead'],
    'Door_Springs': ['SpringPackage'],
    'Railings': ['spijlenhekwerk', 'Railing', 'hek'],
    'Silos': ['Silo', 'Tank', 'CPAC'],
    'Glass': ['glas 24mm', 'paneel glas', 'isolerend glas'],
    'Mullions': ['Circular Mullion', 'Mullion', 'kozijn', 'gesloten paneel'],
    'Stairs_Structure': ['Stair', 'Trap', 'kolom', 'spant', 'trede_staal', 'trapboom'],
    'Building_Main': ['hoofdgebouw'],
    'Building_House': ['woning'],
    'Building_Shed_Practical': ['loods 1'],
    'Building_Sheds_Campus': ['schuur 1', 'schuur 3', 'schuur 4', 'gebouw tussen silo', 'milk & dairy', 'hok 1', 'unit'],
    'Campus_Logo': ['logo schaalbaar', 'model text']
}

tex_dir = '/Users/bert/dev/barnsimulation/scratch/textures'
TEXTURE_MAP = {
    'Roofs': f'{tex_dir}/roof_metal_diffuse.png',
    'Walls_Wood': f'{tex_dir}/barn_wood_diffuse.png',
    'Walls_Sandwich': f'{tex_dir}/sandwich_panel_diffuse.png',
    'Walls_Brick': f'{tex_dir}/brick_diffuse.png',
    'Building_House': f'{tex_dir}/brick_diffuse.png',
    'Building_Sheds_Campus': f'{tex_dir}/sandwich_panel_diffuse.png',
    'Building_Shed_Practical': f'{tex_dir}/sandwich_panel_diffuse.png',
    'Floors_Ground': f'{tex_dir}/grass_diffuse.png',
    'Floors_Paving': f'{tex_dir}/paving_diffuse.png',
    'Floors_Water': f'{tex_dir}/water_diffuse.png',
    'Floors_Concrete': f'{tex_dir}/concrete_diffuse.png',
    'Silos': f'{tex_dir}/silo_diffuse.png'
}

loaded_images = {}
for cat, path in TEXTURE_MAP.items():
    if os.path.exists(path):
        loaded_images[cat] = bpy.data.images.load(path)

def create_textured_material(mat_name, base_color, roughness, metalness, uv_scale=10.0, alpha=1.0, tex_cat=None):
    mat = bpy.data.materials.new(name=f"Mat_{mat_name}")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")

    if bsdf:
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metalness
        if alpha < 1.0:
            if "Alpha" in bsdf.inputs:
                bsdf.inputs["Alpha"].default_value = alpha

        target_tex = tex_cat or mat_name
        if target_tex in loaded_images:
            tex_img = loaded_images[target_tex]
            tex_node = nodes.new('ShaderNodeTexImage')
            tex_node.image = tex_img
            links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])

            coord_node = nodes.new('ShaderNodeTexCoord')
            map_node = nodes.new('ShaderNodeMapping')
            map_node.inputs['Scale'].default_value = (uv_scale, uv_scale, uv_scale)
            links.new(coord_node.outputs['UV'], map_node.inputs['Vector'])
            links.new(map_node.outputs['Vector'], tex_node.inputs['Vector'])
        else:
            if "Base Color" in bsdf.inputs:
                bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)

    return mat

CONFIG = {
    'Roofs': ((0.16, 0.18, 0.22), 0.45, 0.3, 14.0, 1.0),
    'Gutters': ((0.40, 0.42, 0.45), 0.35, 0.6, 1.0, 1.0),
    'Walls_Wood': ((0.52, 0.12, 0.10), 0.65, 0.05, 8.0, 1.0),
    'Walls_Sandwich': ((0.82, 0.84, 0.85), 0.4, 0.1, 6.0, 1.0),
    'Walls_Brick': ((0.45, 0.20, 0.14), 0.85, 0.0, 12.0, 1.0),
    'Walls_Concrete': ((0.68, 0.70, 0.72), 0.75, 0.05, 1.0, 1.0),
    'Floors_Ground': ((0.28, 0.62, 0.22), 0.9, 0.0, 35.0, 1.0),
    'Floors_Paving': ((0.28, 0.30, 0.34), 0.8, 0.05, 18.0, 1.0),
    'Floors_Water': ((0.15, 0.40, 0.60), 0.15, 0.2, 8.0, 0.85),
    'Floors_Concrete': ((0.62, 0.64, 0.65), 0.7, 0.05, 12.0, 1.0),
    'Doors_Industrial': ((0.10, 0.35, 0.72), 0.35, 0.2, 1.0, 1.0),
    'Door_Springs': ((0.30, 0.32, 0.35), 0.5, 0.8, 1.0, 1.0),
    'Railings': ((0.75, 0.76, 0.78), 0.3, 0.75, 1.0, 1.0),
    'Silos': ((0.85, 0.87, 0.90), 0.25, 0.85, 8.0, 1.0),
    'Glass': ((0.65, 0.82, 0.95), 0.1, 0.1, 1.0, 0.35),
    'Mullions': ((0.20, 0.22, 0.25), 0.4, 0.6, 1.0, 1.0),
    'Stairs_Structure': ((0.42, 0.45, 0.48), 0.4, 0.7, 1.0, 1.0),
    'Building_Main': ((0.92, 0.94, 0.96), 0.5, 0.05, 1.0, 1.0),
    'Building_House': ((0.48, 0.22, 0.15), 0.85, 0.0, 12.0, 1.0),
    'Building_Shed_Practical': ((0.24, 0.38, 0.28), 0.45, 0.1, 6.0, 1.0),
    'Building_Sheds_Campus': ((0.32, 0.42, 0.34), 0.5, 0.1, 6.0, 1.0),
    'Campus_Logo': ((0.02, 0.25, 0.55), 0.3, 0.2, 1.0, 1.0),
    'Other_Buildings': ((0.78, 0.78, 0.78), 0.6, 0.05, 1.0, 1.0)
}

# Materials for authentic stalinrichting
mat_steel = create_textured_material("GalvSteel", (0.78, 0.80, 0.82), 0.35, 0.85)
mat_lely_red = create_textured_material("LelyRed", (0.78, 0.06, 0.12), 0.35, 0.1)
mat_stainless = create_textured_material("Stainless", (0.88, 0.90, 0.92), 0.2, 0.92)
mat_straw = create_textured_material("Straw", (0.85, 0.72, 0.32), 0.9, 0.0, 6.0)
mat_silage = create_textured_material("Silage", (0.35, 0.45, 0.18), 0.95, 0.0, 8.0)
mat_cowmat = create_textured_material("CowMat", (0.18, 0.28, 0.18), 0.85, 0.05)
mat_silo_white = create_textured_material("SiloWhite", (0.92, 0.93, 0.94), 0.35, 0.05)
mat_concrete_curb = create_textured_material("ConcreteCurb", (0.65, 0.66, 0.67), 0.85, 0.05)
mat_lely_sphere = create_textured_material("LelySphere", (0.35, 0.38, 0.40), 0.4, 0.3)
mat_calfhutch = create_textured_material("CalfHutch", (0.95, 0.96, 0.96), 0.3, 0.05)
mat_bucket = create_textured_material("BucketRed", (0.85, 0.15, 0.10), 0.4, 0.05)
mat_skybox_glass = create_textured_material("SkyboxGlass", (0.68, 0.84, 0.95), 0.1, 0.1, 1.0, 0.35)
mat_wooddesk = create_textured_material("WoodDesk", (0.58, 0.38, 0.22), 0.6, 0.05)
mat_cow_black = create_textured_material("CowBlack", (0.08, 0.08, 0.08), 0.7, 0.05)
mat_cow_white = create_textured_material("CowWhite", (0.92, 0.92, 0.90), 0.7, 0.05)
mat_cow_pink = create_textured_material("CowPink", (0.92, 0.65, 0.65), 0.5, 0.05)
mat_mueller_blue = create_textured_material("MuellerBlue", (0.10, 0.35, 0.75), 0.35, 0.2)
mat_feedbin_yellow = create_textured_material("FeedBinYellow", (0.85, 0.65, 0.15), 0.4, 0.1)

# Helper geometry builders
def make_box(name, pos, size, target_list, mat):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pos)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(mat)
    target_list.append(obj)
    return obj

def make_cyl(name, pos, radius, depth, target_list, mat, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=depth, location=pos, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    obj.data.materials.append(mat)
    target_list.append(obj)
    return obj

def make_cow(name, pos, target_list, yaw=0.0, lying=False):
    cx, cy, cz = pos
    cos_a = math.cos(yaw)
    sin_a = math.sin(yaw)
    b_z = cz + (0.55 if lying else 1.15)
    b_size = (0.9, 1.8, 0.85) if not lying else (1.1, 1.8, 0.7)
    make_box(f"{name}_Body", (cx, cy, b_z), b_size, target_list, mat_cow_white)
    make_box(f"{name}_Patch1", (cx + 0.15*cos_a, cy + 0.15*sin_a, b_z + 0.1), (0.75, 0.8, 0.86), target_list, mat_cow_black)
    h_dist = 1.05
    h_x = cx - sin_a * h_dist
    h_y = cy + cos_a * h_dist
    h_z = cz + (0.7 if lying else 1.35)
    make_box(f"{name}_Neck", (h_x, h_y, h_z), (0.45, 0.5, 0.5), target_list, mat_cow_white)
    make_box(f"{name}_Head", (h_x - sin_a * 0.3, h_y + cos_a * 0.3, h_z + 0.1), (0.38, 0.45, 0.4), target_list, mat_cow_black)
    make_box(f"{name}_Muzzle", (h_x - sin_a * 0.55, h_y + cos_a * 0.55, h_z), (0.3, 0.25, 0.25), target_list, mat_cow_pink)
    if not lying:
        for lx in [-0.3, 0.3]:
            for ly in [-0.65, 0.65]:
                leg_x = cx + lx * cos_a - ly * sin_a
                leg_y = cy + lx * sin_a + ly * cos_a
                make_cyl(f"{name}_Leg", (leg_x, leg_y, cz + 0.45), 0.08, 0.9, target_list, mat_cow_white)
    else:
        make_box(f"{name}_LegFold", (cx + 0.45*cos_a, cy, cz + 0.2), (0.35, 1.6, 0.3), target_list, mat_cow_white)

# ---------------------------------------------------------------------
# Assign imported FBX objects to categories & zones
# ---------------------------------------------------------------------
classified_fbx = {cat: [] for cat in CATEGORIES}
classified_fbx['Other'] = []

for obj in mesh_objs:
    n = obj.name.lower()
    matched = False
    for cat, kws in CATEGORIES.items():
        if any(kw.lower() in n for kw in kws):
            classified_fbx[cat].append(obj)
            matched = True
            break
    if not matched:
        classified_fbx['Other'].append(obj)

def get_obj_center(obj):
    bb = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
    return (
        sum(v.x for v in bb) / 8.0,
        sum(v.y for v in bb) / 8.0,
        sum(v.z for v in bb) / 8.0
    )

glb_objects = {
    'campus_terrein': [],
    'hoofdgebouw': [],
    'evabarn': [],
    'voedingsstal': [],
    'melkstal': [],
    'milieustallen': []
}

for cat, objs in classified_fbx.items():
    if not objs: continue
    
    cfg = CONFIG.get(cat, ((0.7, 0.7, 0.7), 0.5, 0.0, 1.0, 1.0))
    mat = create_textured_material(cat, cfg[0], cfg[1], cfg[2], cfg[3], cfg[4])

    for o in objs:
        o.data.materials.clear()
        o.data.materials.append(mat)
        
        # Paving height adjustment to prevent z-fighting
        if cat == 'Floors_Paving':
            for v in o.data.vertices:
                v.co.z += 0.06

        # Determine zone
        if 'hoofdgebouw' in o.name.lower() or 'ontwerp' in o.name.lower() or 'logo schaalbaar' in o.name.lower():
            glb_objects['hoofdgebouw'].append(o)
        elif cat in ['Floors_Ground', 'Floors_Water', 'Floors_Paving']:
            glb_objects['campus_terrein'].append(o)
        elif cat == 'Building_Shed_Practical' or 'loods 1' in o.name.lower():
            glb_objects['evabarn'].append(o)
        elif 'schuur 3' in o.name.lower():
            glb_objects['voedingsstal'].append(o)
        elif 'milk & dairy' in o.name.lower():
            glb_objects['melkstal'].append(o)
        else:
            cx, cy, cz = get_obj_center(o)
            if -28.0 <= cx <= 32.0 and -46.0 <= cy <= -5.0:
                glb_objects['hoofdgebouw'].append(o)
            elif 8.0 <= cx <= 85.0 and -5.0 < cy <= 35.0:
                glb_objects['evabarn'].append(o)
            elif -98.0 <= cx <= -45.0 and 50.0 <= cy <= 130.0:
                glb_objects['voedingsstal'].append(o)
            elif -150.0 <= cx <= -99.0 and 5.0 <= cy <= 70.0:
                glb_objects['melkstal'].append(o)
            elif -5.0 <= cx <= 48.0 and -2.0 <= cy <= 168.0:
                glb_objects['milieustallen'].append(o)
            else:
                glb_objects['campus_terrein'].append(o)

# Fine-tune Hoofdgebouw materials and clean UV mapping
mat_hg_main = create_textured_material("Building_Main", (0.92, 0.94, 0.96), 0.35, 0.05)
mat_hg_roof = create_textured_material("Roofs", (0.20, 0.22, 0.26), 0.45, 0.20)
mat_logo_blue = create_textured_material("Campus_Logo", (0.01, 0.28, 0.65), 0.25, 0.40)

hg_main_mesh = bpy.data.objects.get('hoofdgebouw hoofdgebouw [5691032]')
if hg_main_mesh:
    hg_main_mesh.data.materials.clear()
    hg_main_mesh.data.materials.append(mat_hg_main) # Slot 0: Facade
    hg_main_mesh.data.materials.append(mat_hg_roof) # Slot 1: Roof
    for p in hg_main_mesh.data.polygons:
        wn = hg_main_mesh.matrix_world.to_3x3() @ p.normal
        wn.normalize()
        if wn.z > 0.15:
            p.material_index = 1
        else:
            p.material_index = 0

logo_mesh = bpy.data.objects.get('DAIRY CAMPUS LOGO SCHAALBAAR LOGO SCHAALBAAR [5929266]')
if logo_mesh:
    logo_mesh.data.materials.clear()
    logo_mesh.data.materials.append(mat_logo_blue)

for o in glb_objects['hoofdgebouw']:
    if 'ontwerpdak' in o.name.lower() or 'ontwerp ihwg' in o.name.lower():
        o.data.materials.clear()
        o.data.materials.append(mat_hg_roof)
    elif 'ontwerpwand' in o.name.lower():
        o.data.materials.clear()
        o.data.materials.append(mat_hg_main)


print("FBX objects routed to zones:")
for k, v in glb_objects.items():
    print(f"  {k}: {len(v)} meshes")

# =====================================================================
# 2. GENERATE DETAILED INTERIORS FOR EACH BUILDING
# =====================================================================

# ---------------------------------------------------------------------
# A. HOOFDGEBOUW (Authentic Revit Architecture - No clipping boxes)
# ---------------------------------------------------------------------
print(f"Hoofdgebouw contains {len(glb_objects['hoofdgebouw'])} authentic Revit objects")

# ---------------------------------------------------------------------
# B. EVABARN INTERIOR (Loods 1 / Innovatie & Jongveestal)
# ---------------------------------------------------------------------
eva_items = []
calf_base_x = 68.5
calf_base_y = 5.0
make_box("Calf_Group_Straw_1", (calf_base_x - 3.5, calf_base_y + 12.0, 0.10), (7.0, 8.0, 0.18), eva_items, mat_straw)
make_box("Calf_Group_Straw_2", (calf_base_x - 3.5, calf_base_y + 3.0,  0.10), (7.0, 8.0, 0.18), eva_items, mat_straw)
make_box("Calf_Group_Straw_3", (calf_base_x - 3.5, calf_base_y - 6.0,  0.10), (7.0, 8.0, 0.18), eva_items, mat_straw)
make_box("Calf_Group_Straw_4", (calf_base_x - 3.5, calf_base_y - 15.0, 0.10), (7.0, 8.0, 0.18), eva_items, mat_straw)

for py in [calf_base_y + 16.0, calf_base_y + 7.5, calf_base_y - 1.5, calf_base_y - 10.5, calf_base_y - 19.5]:
    make_box(f"Calf_Gate_{py}", (calf_base_x - 3.5, py, 0.55), (7.0, 0.06, 1.0), eva_items, mat_steel)

for c, ch_y in enumerate([calf_base_y + 14.0, calf_base_y + 10.0, calf_base_y + 6.0, calf_base_y + 2.0,
                          calf_base_y - 2.0, calf_base_y - 6.0, calf_base_y - 10.0, calf_base_y - 14.0]):
    make_box(f"Calf_Hutch_{c}", (calf_base_x + 1.8, ch_y, 0.75), (1.5, 2.2, 1.4), eva_items, mat_calfhutch)
    make_box(f"Calf_Pen_Fence_{c}", (calf_base_x + 2.2, ch_y, 0.5), (1.4, 2.1, 0.9), eva_items, mat_steel)
    make_cyl(f"Milk_Bucket_{c}", (calf_base_x + 2.65, ch_y, 0.35), 0.14, 0.28, eva_items, mat_bucket)

mt_x = calf_base_x + 1.2
mt_y = calf_base_y + 2.0
make_cyl("MilkTaxi_Tank", (mt_x, mt_y, 0.75), 0.40, 0.85, eva_items, mat_stainless)
make_box("MilkTaxi_Frame", (mt_x, mt_y, 0.28), (0.95, 0.95, 0.2), eva_items, mat_steel)
make_cyl("MilkTaxi_Handle", (mt_x - 0.45, mt_y, 1.05), 0.025, 0.6, eva_items, mat_steel, rot=(0, 0.4, 0))
make_cyl("MilkTaxi_Wheel_L", (mt_x + 0.38, mt_y - 0.45, 0.2), 0.2, 0.08, eva_items, mat_bucket, rot=(1.5708, 0, 0))
make_cyl("MilkTaxi_Wheel_R", (mt_x + 0.38, mt_y + 0.45, 0.2), 0.2, 0.08, eva_items, mat_bucket, rot=(1.5708, 0, 0))
make_cyl("MilkTaxi_Wheel_Front", (mt_x - 0.38, mt_y, 0.15), 0.15, 0.08, eva_items, mat_bucket, rot=(1.5708, 0, 0))
make_cyl("MilkTaxi_DoserGun", (mt_x, mt_y + 0.38, 0.95), 0.03, 0.35, eva_items, mat_lely_red)

make_box("Calf_Feeder_Station", (calf_base_x - 6.5, calf_base_y + 7.5, 0.9), (1.0, 1.0, 1.6), eva_items, mat_stainless)
make_box("Spoelplaats_Sink", (calf_base_x - 6.5, calf_base_y - 10.0, 0.5), (1.2, 2.0, 0.8), eva_items, mat_stainless)
make_box("Spoelplaats_Boiler", (calf_base_x - 6.8, calf_base_y - 12.0, 1.4), (0.6, 0.6, 1.4), eva_items, mat_stainless)

make_box("EVA_Sensor_Console", (calf_base_x + 4.0, calf_base_y - 2.0, 0.8), (0.8, 1.2, 1.4), eva_items, mat_stainless)
make_cyl("EVA_Antenna_Mast", (calf_base_x + 4.0, calf_base_y - 2.0, 2.2), 0.04, 2.8, eva_items, mat_steel)

make_cow("Calf_Group_1", (calf_base_x - 3.5, calf_base_y + 11.0, 0.10), eva_items, yaw=0.5, lying=True)
make_cow("Calf_Group_2", (calf_base_x - 4.5, calf_base_y + 2.0, 0.10), eva_items, yaw=1.8, lying=False)
make_cow("Calf_Group_3", (calf_base_x - 2.8, calf_base_y - 7.0, 0.10), eva_items, yaw=-1.2, lying=True)
glb_objects['evabarn'].extend(eva_items)
print(f"Generated {len(eva_items)} items for evaBarn")

# ---------------------------------------------------------------------
# C. VOEDINGSSTAL INTERIOR (Gebouw 12 from Gas-Water 12.pdf)
# ---------------------------------------------------------------------
vs_items = []
vs_mid_x = -71.25
vs_y_start = 58.0
vs_y_end = 122.0
vs_len = vs_y_end - vs_y_start
vs_mid_y = vs_y_start + vs_len / 2.0

# 1. Central Feeding Alley
make_box("VS_Voergang_Floor", (vs_mid_x, vs_mid_y, 0.15), (4.6, vs_len, 0.30), vs_items, mat_concrete_curb)
make_box("VS_Voergang_Curb_W", (vs_mid_x - 2.35, vs_mid_y, 0.25), (0.15, vs_len, 0.40), vs_items, mat_concrete_curb)
make_box("VS_Voergang_Curb_E", (vs_mid_x + 2.35, vs_mid_y, 0.25), (0.15, vs_len, 0.40), vs_items, mat_concrete_curb)
make_box("VS_Silage_Feed", (vs_mid_x, vs_mid_y, 0.35), (2.0, vs_len - 6.0, 0.25), vs_items, mat_silage)

# 2. RIC (Roughage Intake Control) Individual Weighing Troughs along both sides of Voergang
ric_spacing = 1.40
ric_count = int((vs_len - 10.0) / ric_spacing)
ric_start_y = vs_y_start + 5.0

for r_side, r_sign, r_x in [("West", -1, vs_mid_x - 2.8), ("East", 1, vs_mid_x + 2.8)]:
    make_box(f"VS_RIC_Rail_{r_side}", (r_x, vs_mid_y, 1.25), (0.10, vs_len, 0.10), vs_items, mat_steel)
    for i in range(ric_count):
        ry = ric_start_y + i * ric_spacing
        make_box(f"VS_RIC_Bin_{r_side}_{i}", (r_x, ry, 0.55), (0.75, 1.0, 0.75), vs_items, mat_stainless)
        make_box(f"VS_RIC_Gate_{r_side}_{i}", (r_x + r_sign * 0.4, ry, 0.85), (0.05, 0.9, 0.7), vs_items, mat_feedbin_yellow)
        make_cyl(f"VS_RIC_Post_{r_side}_{i}", (r_x, ry, 0.7), 0.04, 1.4, vs_items, mat_steel)

# 3. 10 Compartments / Pens (5 West, 5 East) separated by galvanized gates as in 12.pdf
pen_y_divs = [vs_y_start + p * (vs_len / 5.0) for p in range(6)]
for py in pen_y_divs:
    make_box(f"VS_Pen_Gate_W_{py:.0f}", (vs_mid_x - 10.5, py, 0.65), (15.0, 0.08, 1.2), vs_items, mat_steel)
    make_box(f"VS_Pen_Gate_E_{py:.0f}", (vs_mid_x + 10.5, py, 0.65), (15.0, 0.08, 1.2), vs_items, mat_steel)

# 4. Suevia Drinking Bowls (Suevia 500 & 1200 according to 12.pdf)
suevia_ys = [vs_y_start + 10.0, vs_y_start + 25.0, vs_y_start + 40.0, vs_y_start + 55.0]
for idx, sy in enumerate(suevia_ys):
    make_box(f"VS_Suevia500_W_{idx}", (vs_mid_x - 6.0, sy, 0.45), (0.5, 0.8, 0.45), vs_items, mat_stainless)
    make_box(f"VS_Water_W_{idx}", (vs_mid_x - 6.0, sy, 0.58), (0.45, 0.75, 0.05), vs_items, mat_skybox_glass)
    make_box(f"VS_Suevia500_E_{idx}", (vs_mid_x + 6.0, sy, 0.45), (0.5, 0.8, 0.45), vs_items, mat_stainless)
    make_box(f"VS_Water_E_{idx}", (vs_mid_x + 6.0, sy, 0.58), (0.45, 0.75, 0.05), vs_items, mat_skybox_glass)

# 5. Comfort Ligboxen (Cubicles) for cows on trial
for row_x, rname in [(vs_mid_x - 14.5, "RowW"), (vs_mid_x + 14.5, "RowE")]:
    make_box(f"VS_Mat_{rname}", (row_x, vs_mid_y, 0.12), (2.4, vs_len, 0.20), vs_items, mat_cowmat)
    make_box(f"VS_Schoftboom_{rname}", (row_x, vs_mid_y, 1.10), (0.06, vs_len, 0.06), vs_items, mat_steel)
    div_step = 1.25
    for d in range(int(vs_len / div_step) + 1):
        dy = vs_y_start + d * div_step
        make_box(f"VS_Div_{rname}_{d}", (row_x, dy, 0.70), (2.2, 0.05, 0.80), vs_items, mat_steel)

# 6. Outdoor Concentrate Silos
vs_silo_x = vs_mid_x - 23.0
vs_silo_y = vs_mid_y
make_box("VS_Silo_Pad", (vs_silo_x, vs_silo_y, 0.08), (4.5, 12.0, 0.16), vs_items, mat_concrete_curb)
for s_idx, sy in enumerate([vs_silo_y - 3.5, vs_silo_y, vs_silo_y + 3.5]):
    make_cyl(f"VS_Silo_{s_idx+1}", (vs_silo_x, sy, 4.5), 1.25, 5.5, vs_items, mat_silo_white)
    make_cyl(f"VS_SiloCone_{s_idx+1}", (vs_silo_x, sy, 1.4), 0.75, 1.2, vs_items, mat_silo_white)

# 7. Cows eating at RIC bins and lying in cubicles
for c_idx, cy in enumerate([vs_y_start + 12.0, vs_y_start + 26.0, vs_y_start + 38.0, vs_y_start + 50.0]):
    make_cow(f"Cow_VS_Eating_W_{c_idx}", (vs_mid_x - 4.5, cy, 0.0), vs_items, yaw=-1.57, lying=False)
    make_cow(f"Cow_VS_Eating_E_{c_idx}", (vs_mid_x + 4.5, cy + 3.0, 0.0), vs_items, yaw=1.57, lying=False)
    make_cow(f"Cow_VS_Cubicle_W_{c_idx}", (vs_mid_x - 14.5, cy + 5.0, 0.12), vs_items, yaw=0.0, lying=True)
    make_cow(f"Cow_VS_Cubicle_E_{c_idx}", (vs_mid_x + 14.5, cy + 2.0, 0.12), vs_items, yaw=3.14, lying=True)

glb_objects['voedingsstal'].extend(vs_items)
print(f"Generated {len(vs_items)} items for Voedingsstal")

# ---------------------------------------------------------------------
# D. MELKSTAL INTERIOR (Gebouw 11 from Gas-Water 11.pdf)
# ---------------------------------------------------------------------
ms_items = []
ms_center_x = -125.0
ms_center_y = 44.0

# 1. 40-stands Rotary Milking Carousel
carousel_radius = 7.0
inner_pit_radius = 3.5
make_cyl("MS_Carousel_Platform", (ms_center_x, ms_center_y, 0.40), carousel_radius, 0.35, ms_items, mat_concrete_curb)
make_cyl("MS_Operator_Pit_Floor", (ms_center_x, ms_center_y, -0.40), inner_pit_radius, 0.20, ms_items, mat_concrete_curb)
make_cyl("MS_Operator_Pit_Wall", (ms_center_x, ms_center_y, 0.0), inner_pit_radius, 0.80, ms_items, mat_steel)

make_box("MS_Operator_Bridge", (ms_center_x, ms_center_y - 2.0, 0.0), (1.2, 4.0, 0.15), ms_items, mat_stainless)
make_box("MS_Operator_Console", (ms_center_x, ms_center_y, 0.65), (1.0, 0.8, 1.1), ms_items, mat_stainless)
make_box("MS_Operator_Screen", (ms_center_x, ms_center_y, 1.3), (0.6, 0.05, 0.4), ms_items, mat_stainless)

make_cyl("MS_Overhead_Swivel", (ms_center_x, ms_center_y, 3.2), 0.45, 1.2, ms_items, mat_stainless)
make_cyl("MS_Milk_Ring_Duct", (ms_center_x, ms_center_y, 2.8), 5.5, 0.12, ms_items, mat_stainless)

num_stands = 40
for s in range(num_stands):
    angle = s * (2.0 * math.pi / num_stands)
    cos_s = math.cos(angle)
    sin_s = math.sin(angle)
    
    div_r = (inner_pit_radius + carousel_radius) / 2.0
    div_x = ms_center_x + cos_s * div_r
    div_y = ms_center_y + sin_s * div_r
    make_box(f"MS_Stall_Div_{s}", (div_x, div_y, 0.95), (0.05, carousel_radius - inner_pit_radius, 0.85), ms_items, mat_steel)
    
    bowl_x = ms_center_x + cos_s * (carousel_radius - 0.35)
    bowl_y = ms_center_y + sin_s * (carousel_radius - 0.35)
    make_cyl(f"MS_Feed_Bowl_{s}", (bowl_x, bowl_y, 0.70), 0.22, 0.35, ms_items, mat_stainless)
    
    cluster_x = ms_center_x + cos_s * (inner_pit_radius + 0.6)
    cluster_y = ms_center_y + sin_s * (inner_pit_radius + 0.6)
    make_cyl(f"MS_Milk_Claw_{s}", (cluster_x, cluster_y, 0.60), 0.08, 0.25, ms_items, mat_stainless)

# 2. Waiting Pen / Holding Area (Wachtruimte)
wait_y_start = 14.0
wait_y_end = 36.0
wait_len = wait_y_end - wait_y_start
wait_mid_y = wait_y_start + wait_len / 2.0
make_box("MS_Waiting_Floor", (ms_center_x, wait_mid_y, 0.05), (14.0, wait_len, 0.10), ms_items, mat_concrete_curb)
make_box("MS_Wait_Fence_W", (ms_center_x - 7.0, wait_mid_y, 0.75), (0.08, wait_len, 1.3), ms_items, mat_steel)
make_box("MS_Wait_Fence_E", (ms_center_x + 7.0, wait_mid_y, 0.75), (0.08, wait_len, 1.3), ms_items, mat_steel)
make_box("MS_Backing_Gate", (ms_center_x, wait_y_start + 6.0, 0.85), (13.8, 0.15, 1.5), ms_items, mat_steel)
make_box("MS_Backing_Gate_Drive", (ms_center_x - 6.8, wait_y_start + 6.0, 1.8), (0.5, 0.5, 0.5), ms_items, mat_lely_red)

# 3. Milk Tank Room (Tanklokaal) & Mueller Bulk Milk Tank
tank_x = ms_center_x + 12.0
tank_y = 30.0
make_box("MS_Tank_Room_Floor", (tank_x, tank_y, 0.05), (6.5, 9.0, 0.10), ms_items, mat_concrete_curb)
make_cyl("MS_Mueller_Tank_Body", (tank_x, tank_y, 1.8), 1.4, 5.5, ms_items, mat_stainless, rot=(1.5708, 0, 0))
make_box("MS_Mueller_Control_Box", (tank_x - 1.5, tank_y - 2.5, 1.2), (0.4, 0.6, 0.9), ms_items, mat_mueller_blue)
make_cyl("MS_Mueller_Agitator", (tank_x, tank_y, 3.2), 0.25, 0.45, ms_items, mat_stainless)

# 4. Technical Machine Room
tech_x = ms_center_x + 12.0
tech_y = 42.0
make_box("MS_Tech_Room_Floor", (tech_x, tech_y, 0.05), (6.5, 8.0, 0.10), ms_items, mat_concrete_curb)
make_box("MS_Vacuum_Pump_1", (tech_x - 1.5, tech_y - 2.0, 0.6), (1.0, 1.2, 1.0), ms_items, mat_mueller_blue)
make_box("MS_Vacuum_Pump_2", (tech_x - 1.5, tech_y + 1.0, 0.6), (1.0, 1.2, 1.0), ms_items, mat_mueller_blue)
make_cyl("MS_Hot_Water_Boiler", (tech_x + 1.5, tech_y - 1.0, 1.4), 0.55, 1.8, ms_items, mat_stainless)
make_box("MS_Heat_Exchanger", (tech_x + 1.5, tech_y + 2.0, 1.0), (0.6, 0.8, 1.4), ms_items, mat_stainless)

# 5. Cows waiting and on carousel
make_cow("Cow_MS_Wait_1", (ms_center_x - 2.5, wait_y_start + 12.0, 0.0), ms_items, yaw=0.0, lying=False)
make_cow("Cow_MS_Wait_2", (ms_center_x + 2.0, wait_y_start + 16.0, 0.0), ms_items, yaw=0.2, lying=False)
make_cow("Cow_MS_Wait_3", (ms_center_x - 1.0, wait_y_start + 22.0, 0.0), ms_items, yaw=-0.1, lying=False)

for c_stand in [2, 6, 12, 18, 24, 30, 36]:
    ang = c_stand * (2.0 * math.pi / num_stands)
    c_r = (inner_pit_radius + carousel_radius) / 2.0
    cow_x = ms_center_x + math.cos(ang) * c_r
    cow_y = ms_center_y + math.sin(ang) * c_r
    make_cow(f"Cow_MS_Carousel_{c_stand}", (cow_x, cow_y, 0.40), ms_items, yaw=ang + 1.57, lying=False)

glb_objects['melkstal'].extend(ms_items)
print(f"Generated {len(ms_items)} items for Melkstal")

# ---------------------------------------------------------------------
# E. MILIEUSTALLEN INTERIOR (DLV Blueprint B230655-11-B10)
# ---------------------------------------------------------------------
b10_items = []

robot_positions = [
    (18.2, 38.0, 0.0, 0, "Robot_1_Bestaand"),
    (26.2, 58.0, 0.0, 3.14159, "Robot_2_Tussenlid_Zuid"),
    (26.2, 63.5, 0.0, 3.14159, "Robot_3_Tussenlid_Zuid"),
    (17.8, 58.0, 0.0, 0, "Robot_4_Tussenlid_Noord"),
    (17.8, 63.5, 0.0, 0, "Robot_5_Tussenlid_Noord"),
]

for idx, (rx, ry, rz, rrot, rname) in enumerate(robot_positions):
    pfx = f"Lely_{rname}"
    make_box(f"{pfx}_Frame", (rx, ry, rz + 0.95), (1.1, 2.3, 1.9), b10_items, mat_stainless)
    make_box(f"{pfx}_RedCover", (rx, ry, rz + 1.95), (1.12, 2.32, 0.15), b10_items, mat_lely_red)
    make_box(f"{pfx}_RedSide", (rx + (0.55 if rrot==0 else -0.55), ry, rz + 1.1), (0.05, 2.32, 1.6), b10_items, mat_lely_red)
    feed_y = ry + (0.9 if rrot==0 else -0.9)
    make_box(f"{pfx}_Trough", (rx, feed_y, rz + 0.6), (0.7, 0.45, 0.65), b10_items, mat_stainless)
    arm_y = ry - (0.3 if rrot==0 else -0.3)
    make_box(f"{pfx}_ArmBase", (rx + (0.3 if rrot==0 else -0.3), arm_y, rz + 0.35), (0.45, 0.25, 0.25), b10_items, mat_stainless)
    make_cyl(f"{pfx}_LaserCluster", (rx, arm_y, rz + 0.45), 0.12, 0.25, b10_items, mat_lely_red)
    make_cyl(f"{pfx}_MilkJar", (rx + (0.45 if rrot==0 else -0.45), ry - 0.7, rz + 1.2), 0.14, 0.45, b10_items, mat_skybox_glass)
    make_cyl(f"{pfx}_Pipe", (rx + (0.45 if rrot==0 else -0.45), ry - 0.7, rz + 1.65), 0.03, 0.5, b10_items, mat_stainless)
    make_cyl(f"{pfx}_FeedAuger", (rx, ry, rz + 2.4), 0.08, 3.2, b10_items, mat_steel, rot=(0, 1.5708, 0))
    chute_x = rx - (0.75 if rrot==0 else -0.75)
    make_box(f"{pfx}_Chute_Entry", (chute_x, ry - 0.9, rz + 0.7), (0.06, 1.4, 1.2), b10_items, mat_steel)
    make_box(f"{pfx}_Chute_Exit", (chute_x, ry + 0.9, rz + 0.7), (0.06, 1.4, 1.2), b10_items, mat_steel)

make_cow("Cow_Milking_Robot1", (18.2, 38.0, 0.0), b10_items, yaw=0.0, lying=False)
make_cow("Cow_Milking_Robot4", (17.8, 58.0, 0.0), b10_items, yaw=0.0, lying=False)

for gy in [55.0, 60.5, 66.0]:
    make_box(f"Gate_Cross_{gy}", (22.0, gy, 0.65), (8.2, 0.08, 1.2), b10_items, mat_steel)
for gx in [16.8, 22.0, 27.2]:
    make_box(f"Gate_Long_{gx}", (gx, 60.5, 0.65), (0.08, 11.2, 1.2), b10_items, mat_steel)

make_box("Treatment_Crush_Frame", (22.0, 53.5, 0.95), (1.1, 2.4, 1.9), b10_items, mat_steel)
make_box("Treatment_Crush_Headgate", (22.0, 54.6, 0.95), (0.9, 0.08, 1.8), b10_items, mat_steel)
make_box("Treatment_Crush_Belt", (22.0, 53.5, 0.8), (0.8, 0.6, 0.2), b10_items, mat_steel)

make_box("PC_Floor_Slab", (22.0, 60.5, 0.06), (3.0, 3.8, 0.12), b10_items, mat_concrete_curb)
make_box("PC_Desk", (22.0, 60.5, 0.45), (1.6, 0.8, 0.75), b10_items, mat_wooddesk)
make_box("PC_Monitor_1", (21.7, 60.5, 0.95), (0.45, 0.05, 0.35), b10_items, mat_stainless)
make_box("PC_Monitor_2", (22.3, 60.5, 0.95), (0.45, 0.05, 0.35), b10_items, mat_stainless)

silo_base_x = 45.8
silo_base_y = 59.0
make_box("Silobet_Pad", (silo_base_x, silo_base_y, 0.08), (3.2, 6.2, 0.16), b10_items, mat_concrete_curb)
for s_idx, sy in enumerate([silo_base_y - 1.8, silo_base_y + 1.8]):
    pfx = f"Krachtvoersilo_Tussen_{s_idx+1}"
    make_cyl(f"{pfx}_Body", (silo_base_x, sy, 4.2), 1.15, 4.8, b10_items, mat_silo_white)
    make_cyl(f"{pfx}_Cone", (silo_base_x, sy, 1.3), 0.7, 1.2, b10_items, mat_silo_white)
    for lx in [-0.9, 0.9]:
        for ly in [-0.9, 0.9]:
            make_cyl(f"{pfx}_Leg", (silo_base_x + lx, sy + ly, 1.0), 0.06, 2.0, b10_items, mat_steel)
make_cyl("Silo_50m3_Body", (silo_base_x + 1.8, silo_base_y, 4.8), 1.55, 6.2, b10_items, mat_silo_white)
for lx in [-1.2, 1.2]:
    for ly in [-1.2, 1.2]:
        make_cyl(f"Silo_50m3_Leg", (silo_base_x + 1.8 + lx, silo_base_y + ly, 1.1), 0.08, 2.2, b10_items, mat_steel)
make_cyl("Auger_Main_Line", (35.0, silo_base_y, 2.8), 0.1, 22.0, b10_items, mat_steel, rot=(0, 1.5708, 0))

nb_y_start = 64.0
nb_y_end = 143.5
nb_len = nb_y_end - nb_y_start
nb_mid_y = nb_y_start + nb_len / 2.0

make_box("Voerstoep_North_Floor", (2.2, nb_mid_y, 0.25), (4.4, nb_len, 0.50), b10_items, mat_concrete_curb)
make_box("Voerstoep_North_Curb", (4.35, nb_mid_y, 0.35), (0.15, nb_len, 0.30), b10_items, mat_concrete_curb)
make_box("Silage_North_Alley", (3.4, nb_mid_y, 0.52), (1.1, nb_len, 0.25), b10_items, mat_silage)

make_box("Voerstoep_South_Floor", (41.6, nb_mid_y, 0.25), (4.4, nb_len, 0.50), b10_items, mat_concrete_curb)
make_box("Voerstoep_South_Curb", (39.45, nb_mid_y, 0.35), (0.15, nb_len, 0.30), b10_items, mat_concrete_curb)
make_box("Silage_South_Alley", (40.4, nb_mid_y, 0.52), (1.1, nb_len, 0.25), b10_items, mat_silage)

for x_fence, side in [(4.4, "North"), (39.4, "South")]:
    make_box(f"Feed_Fence_Top_{side}", (x_fence, nb_mid_y, 1.20), (0.08, nb_len, 0.08), b10_items, mat_steel)
    make_box(f"Feed_Fence_Bottom_{side}", (x_fence, nb_mid_y, 0.32), (0.08, nb_len, 0.08), b10_items, mat_steel)
    posts = int(nb_len / 2.4)
    for p in range(posts + 1):
        py = nb_y_start + p * 2.4
        make_cyl(f"Feed_Post_{side}_{p}", (x_fence, py, 0.65), 0.045, 1.3, b10_items, mat_steel)
        if p < posts:
            make_cyl(f"Headlock_{side}_{p}", (x_fence, py + 1.2, 0.74), 0.025, 0.92, b10_items, mat_steel, rot=(0, 0.20 if side=="North" else -0.20, 0))

for x_rail in [3.8, 40.0]:
    make_box(f"Trioliet_Rail_{x_rail}", (x_rail, nb_mid_y, 4.8), (0.12, nb_len, 0.20), b10_items, mat_steel)
make_box("Trioliet_Robot_Body", (40.0, 95.0, 4.2), (1.4, 2.6, 1.1), b10_items, mat_stainless)
make_box("Trioliet_Robot_TopHanger", (40.0, 95.0, 4.75), (0.3, 0.8, 0.3), b10_items, mat_steel)
make_box("Trioliet_Robot_Discharge", (39.5, 95.0, 3.75), (0.4, 1.2, 0.3), b10_items, mat_silage)

cubicle_double_rows = [
    (9.2, 11.6, "Groep1_RowA"),
    (15.8, 18.2, "Groep1_RowB"),
    (25.6, 28.0, "Groep2_RowC"),
    (32.2, 34.6, "Groep2_RowD"),
]

for x1, x2, rname in cubicle_double_rows:
    for rx in [x1, x2]:
        make_box(f"Diepstrooisel_{rname}_{rx}", (rx, nb_mid_y, 0.12), (2.2, nb_len, 0.22), b10_items, mat_straw)
        make_box(f"Schoftboom_{rname}_{rx}", (rx, nb_mid_y, 1.10), (0.06, nb_len, 0.06), b10_items, mat_steel)
        make_box(f"Knieboom_{rname}_{rx}", (rx, nb_mid_y, 0.25), (0.06, nb_len, 0.14), b10_items, mat_steel)
        div_step = 1.20
        divs = int(nb_len / div_step)
        for d in range(divs + 1):
            dy = nb_y_start + d * div_step
            make_box(f"Div_{rname}_{rx}_{d}", (rx, dy, 0.72), (2.1, 0.05, 0.80), b10_items, mat_steel)

for alley_x in [7.0, 13.7, 21.9, 30.1, 36.8]:
    for sy in range(int(nb_y_start + 4.0), int(nb_y_end - 4.0), 6):
        make_cyl(f"LelySphere_{alley_x}_{sy}", (alley_x, float(sy), 0.04), 0.15, 0.08, b10_items, mat_lely_sphere)

crossover_ys = [75.0, 95.0, 115.0, 135.0]
for idx, cy in enumerate(crossover_ys):
    make_box(f"Water_Trough_N_{idx}", (13.7, cy, 0.45), (0.6, 2.2, 0.45), b10_items, mat_stainless)
    make_box(f"Water_Surface_N_{idx}", (13.7, cy, 0.62), (0.54, 2.14, 0.05), b10_items, mat_skybox_glass)
    make_box(f"Water_Trough_S_{idx}", (30.1, cy, 0.45), (0.6, 2.2, 0.45), b10_items, mat_stainless)
    make_box(f"Water_Surface_S_{idx}", (30.1, cy, 0.62), (0.54, 2.14, 0.05), b10_items, mat_skybox_glass)
    for bx in [13.7, 30.1]:
        make_box(f"Brush_Arm_{bx}_{idx}", (bx, cy + 2.5, 1.9), (0.65, 0.08, 0.08), b10_items, mat_steel)
        make_cyl(f"Brush_Roller_{bx}_{idx}", (bx + 0.35, cy + 2.5, 1.45), 0.28, 0.75, b10_items, mat_straw)

ex_y_start = 6.0
ex_y_end = 52.0
ex_len = ex_y_end - ex_y_start
ex_mid_y = ex_y_start + ex_len / 2.0

for rx in [9.5, 11.9]:
    make_box(f"Mattress_DryCows_{rx}", (rx, ex_mid_y, 0.12), (2.4, ex_len, 0.20), b10_items, mat_cowmat)
    make_box(f"Schoftboom_Dry_{rx}", (rx, ex_mid_y, 1.10), (0.06, ex_len, 0.06), b10_items, mat_steel)
    div_step = 1.30
    for d in range(int(ex_len / div_step) + 1):
        dy = ex_y_start + d * div_step
        make_box(f"Div_Dry_{rx}_{d}", (rx, dy, 0.72), (2.3, 0.05, 0.78), b10_items, mat_steel)

make_box("Mattress_Milking30", (32.5, ex_mid_y, 0.12), (2.2, ex_len, 0.20), b10_items, mat_cowmat)
make_box("Schoftboom_Milking30", (32.5, ex_mid_y, 1.10), (0.06, ex_len, 0.06), b10_items, mat_steel)
div_step = 1.20
for d in range(int(ex_len / div_step) + 1):
    dy = ex_y_start + d * div_step
    make_box(f"Div_Milking30_{d}", (32.5, dy, 0.72), (2.1, 0.05, 0.78), b10_items, mat_steel)

make_box("Calving_Straw_Bed", (3.75, 31.0, 0.14), (5.5, 38.0, 0.26), b10_items, mat_straw)
for py in [12.0, 21.5, 31.0, 40.5, 50.0]:
    make_box(f"Calving_Gate_{py}", (3.75, py, 0.65), (5.5, 0.08, 1.2), b10_items, mat_steel)
make_box("Calving_FeedFence", (6.5, 31.0, 0.65), (0.08, 38.0, 1.2), b10_items, mat_steel)

kop_mid_y = 153.5
make_box("Research_AirTreat_Floor", (13.75, kop_mid_y, 0.08), (14.5, 19.0, 0.16), b10_items, mat_concrete_curb)
for idx, (sc_x, sc_y) in enumerate([(9.5, 148.0), (13.75, 148.0), (18.0, 148.0)]):
    pfx = f"AirScrubber_{idx+1}"
    make_cyl(f"{pfx}_Col", (sc_x, sc_y, 2.2), 1.05, 4.2, b10_items, mat_stainless)
    make_cyl(f"{pfx}_Duct", (sc_x, sc_y, 4.4), 0.35, 1.2, b10_items, mat_steel)
    make_cyl(f"{pfx}_Pump", (sc_x, sc_y + 1.2, 0.4), 0.25, 0.7, b10_items, mat_lely_red)
make_cyl("Scrubber_Main_Duct", (13.75, 148.0, 4.9), 0.45, 9.0, b10_items, mat_steel, rot=(0, 1.5708, 0))

make_box("Researcher_Desk", (13.75, 156.0, 0.45), (2.4, 0.9, 0.75), b10_items, mat_wooddesk)
make_box("Researcher_Gas_Analyzer", (13.0, 156.0, 0.95), (0.6, 0.4, 0.45), b10_items, mat_stainless)
make_box("Researcher_Monitor", (14.2, 156.0, 0.95), (0.5, 0.05, 0.35), b10_items, mat_stainless)

make_box("Silovoet_3x12_Pad", (22.0, 166.5, 0.08), (12.0, 3.2, 0.16), b10_items, mat_concrete_curb)
for idx, sx in enumerate([18.0, 22.0, 26.0]):
    pfx = f"Kop_Silo_{idx+1}"
    make_cyl(f"{pfx}_Body", (sx, 166.5, 4.5), 1.2, 5.2, b10_items, mat_silo_white)
    make_cyl(f"{pfx}_Cone", (sx, 166.5, 1.4), 0.75, 1.2, b10_items, mat_silo_white)
    for lx in [-0.95, 0.95]:
        for ly in [-0.95, 0.95]:
            make_cyl(f"{pfx}_Leg", (sx + lx, 166.5 + ly, 1.1), 0.07, 2.2, b10_items, mat_steel)

skybox_y = 60.5
skybox_z = 4.2
make_box("Skybox_Floor", (22.0, skybox_y, skybox_z), (14.0, 7.0, 0.25), b10_items, mat_stainless)
make_box("Skybox_Glass_North", (22.0, skybox_y + 3.45, skybox_z + 0.65), (13.8, 0.06, 1.15), b10_items, mat_skybox_glass)
make_box("Skybox_Glass_South", (22.0, skybox_y - 3.45, skybox_z + 0.65), (13.8, 0.06, 1.15), b10_items, mat_skybox_glass)
make_box("Skybox_Railing_N", (22.0, skybox_y + 3.45, skybox_z + 1.24), (14.0, 0.08, 0.05), b10_items, mat_steel)
make_box("Skybox_Railing_S", (22.0, skybox_y - 3.45, skybox_z + 1.24), (14.0, 0.08, 0.05), b10_items, mat_steel)

make_box("Office_Desk_1", (19.0, skybox_y, skybox_z + 0.45), (1.6, 0.8, 0.75), b10_items, mat_wooddesk)
make_box("Office_Desk_2", (25.0, skybox_y, skybox_z + 0.45), (1.6, 0.8, 0.75), b10_items, mat_wooddesk)
make_box("Monitor_1", (19.0, skybox_y, skybox_z + 0.95), (0.5, 0.05, 0.35), b10_items, mat_stainless)
make_box("Monitor_2", (25.0, skybox_y, skybox_z + 0.95), (0.5, 0.05, 0.35), b10_items, mat_stainless)
make_box("Meeting_Table", (22.0, skybox_y, skybox_z + 0.45), (2.4, 1.2, 0.75), b10_items, mat_wooddesk)

make_box("Skybox_Walkway_Bridge", (36.5, 64.6, skybox_z), (15.0, 1.6, 0.22), b10_items, mat_stainless)
make_box("Skybox_Walkway_Railing_N", (36.5, 65.35, skybox_z + 0.60), (15.0, 0.06, 1.15), b10_items, mat_steel)
make_box("Skybox_Walkway_Railing_S", (36.5, 63.85, skybox_z + 0.60), (15.0, 0.06, 1.15), b10_items, mat_steel)

for c_idx, (cx, cy, cyaw) in enumerate([
    (4.1, 75.0, 1.57), (4.1, 95.0, 1.57), (4.1, 115.0, 1.57), (4.1, 135.0, 1.57),
    (39.7, 85.0, -1.57), (39.7, 105.0, -1.57), (39.7, 125.0, -1.57)
]):
    make_cow(f"Cow_B10_Feed_{c_idx}", (cx, cy, 0.0), b10_items, yaw=cyaw, lying=False)

for c_idx, (cx, cy, cyaw) in enumerate([
    (9.2, 85.0, 3.14), (11.6, 110.0, 0.0), (15.8, 95.0, 3.14), (18.2, 120.0, 0.0),
    (25.6, 85.0, 3.14), (28.0, 110.0, 0.0), (32.2, 95.0, 3.14), (34.6, 120.0, 0.0),
]):
    make_cow(f"Cow_B10_Cubicle_{c_idx}", (cx, cy, 0.12), b10_items, yaw=cyaw, lying=True)

make_cow("Cow_B10_Maternity_1", (3.75, 20.0, 0.14), b10_items, yaw=0.8, lying=True)
make_cow("Cow_B10_Maternity_2", (3.75, 35.0, 0.14), b10_items, yaw=-0.5, lying=False)

glb_objects['milieustallen'].extend(b10_items)
print(f"Generated {len(b10_items)} items for Milieustallen")

# =====================================================================
# 3. JOIN AND EXPORT 6 SEPARATE GLB FILES
# =====================================================================
out_dir = '/Users/bert/dev/barnsimulation/roblox/models'
os.makedirs(out_dir, exist_ok=True)

EXPORT_TARGETS = [
    ('campus_terrein.glb', glb_objects['campus_terrein']),
    ('hoofdgebouw.glb', glb_objects['hoofdgebouw']),
    ('evabarn.glb', glb_objects['evabarn']),
    ('voedingsstal.glb', glb_objects['voedingsstal']),
    ('melkstal.glb', glb_objects['melkstal']),
    ('milieustallen.glb', glb_objects['milieustallen'])
]

total_exported_mb = 0.0

for filename, obj_list in EXPORT_TARGETS:
    out_file = os.path.join(out_dir, filename)
    print(f"\n---> Preparing export for {filename} ({len(obj_list)} objects)...")
    
    if not obj_list:
        print(f"WARNING: No objects for {filename}, skipping!")
        continue

    bpy.ops.object.select_all(action='DESELECT')
    for o in obj_list:
        o.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=out_file,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_normals=True,
        export_image_format='AUTO',
        export_yup=True
    )

    size_mb = os.path.getsize(out_file) / (1024 * 1024)
    total_exported_mb += size_mb
    print(f"✓ Successfully exported {filename}: {size_mb:.2f} MB")

print("\n=============================================================")
print(f"=== ALL 6 MODULAR GLBs EXPORTED! Total size: {total_exported_mb:.2f} MB ===")
print("=============================================================")
