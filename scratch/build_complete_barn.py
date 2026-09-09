import bpy
import mathutils
import os
import math

print("=== Starting Dairy Campus Complete Build (FBX + DLV Stalinrichting) ===")

# 1. Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Import Revit FBX
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
print(f"Importing {fbx_path}...")
bpy.ops.import_scene.fbx(filepath=fbx_path)

mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"Imported {len(mesh_objs)} meshes from FBX")

# Architectural category definitions
CATEGORIES = {
    'Roofs': ['dakplaten', 'Roof', 'dak', 'ontwerpdak', 'isolatie PIR', 'boeiboord'],
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

buckets = {cat: [] for cat in CATEGORIES}
buckets['Other_Buildings'] = []

for obj in mesh_objs:
    matched = False
    name = obj.name.lower()
    for cat, keywords in CATEGORIES.items():
        if any(kw.lower() in name for kw in keywords):
            buckets[cat].append(obj)
            matched = True
            break
    if not matched:
        buckets['Other_Buildings'].append(obj)

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

def create_textured_material(cat_name, base_color, roughness, metalness, uv_scale=10.0, alpha=1.0):
    mat = bpy.data.materials.new(name=f"Mat_{cat_name}")
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

        if cat_name in loaded_images:
            tex_img = loaded_images[cat_name]
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

# Conservative decimation ratios - preserve all architectural features and roads!
# Notice: Floors_Paving has ZERO decimation (100% intact)!
DECIMATE_RATIOS = {
    'Mullions': 0.55,
    'Silos': 0.45,
    'Doors_Industrial': 0.65,
    'Door_Springs': 0.25,
    'Gutters': 0.25,
    'Railings': 0.60,
    'Roofs': 0.75,
    'Floors_Ground': 0.60,
    'Floors_Concrete': 0.75,
}

joined_objects = []

# Open entrance doors at feed alley and side entrances
for d in buckets.get('Doors_Industrial', []):
    bb = [d.matrix_world @ mathutils.Vector(d.bound_box[0]), d.matrix_world @ mathutils.Vector(d.bound_box[6])]
    mx = (bb[0].x + bb[1].x) / 2.0
    my = (bb[0].y + bb[1].y) / 2.0
    if (19.0 < mx < 25.0 and (my > 155.0 or my < 5.0)) or (43.0 < mx < 46.0 and 55.0 < my < 65.0):
        d.location.z += 3.8

for cat, objs in buckets.items():
    if not objs:
        continue

    cfg = CONFIG.get(cat, ((0.7, 0.7, 0.7), 0.5, 0.0, 1.0, 1.0))
    mat = create_textured_material(cat, cfg[0], cfg[1], cfg[2], cfg[3], cfg[4])

    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    
    active_obj = objs[0]
    bpy.context.view_layer.objects.active = active_obj
    
    if len(objs) > 1:
        bpy.ops.object.join()
    
    joined_obj = active_obj
    joined_obj.name = f"Campus_{cat}"
    joined_obj.data.materials.clear()
    joined_obj.data.materials.append(mat)

    # If this is Floors_Paving, raise all vertices by +0.06m to sit cleanly above ground (-0.15m)
    if cat == 'Floors_Paving':
        for v in joined_obj.data.vertices:
            v.co.z += 0.06
        print(f"-> Floors_Paving: raised 21 road meshes by +0.06m to eliminate Z-fighting with terrain.")
    
    # Merge duplicate vertices & smart unwrap (only if needed)
    try:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        # Light merge (1cm) to remove CAD export duplicates
        bpy.ops.mesh.remove_doubles(threshold=0.01)
        bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.01)
        bpy.ops.object.mode_set(mode='OBJECT')
    except Exception as e:
        try:
            bpy.ops.object.mode_set(mode='OBJECT')
        except:
            pass

    # High-efficiency decimation
    if cat in DECIMATE_RATIOS:
        mod = joined_obj.modifiers.new(name="Decimate", type='DECIMATE')
        mod.ratio = DECIMATE_RATIOS[cat]
        bpy.context.view_layer.objects.active = joined_obj
        bpy.ops.object.modifier_apply(modifier="Decimate")

    joined_objects.append(joined_obj)
    print(f"-> Optimized {joined_obj.name}: {len(joined_obj.data.polygons)} polygons")

# =============================================================
# GENERATE FULL ARCHITECTURAL STALINRICHTING (FROM DLV BLUEPRINT B230655-11-B10)
# =============================================================
print("=== Generating Complete DLV Blueprint B10 Stalinrichting ===")

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

int_buckets = {
    "Interior_Steel": [],
    "Interior_LelyRed": [],
    "Interior_Stainless": [],
    "Interior_Straw": [],
    "Interior_Silage": [],
    "Interior_CowMats": [],
    "Interior_Silos": [],
    "Interior_Concrete": [],
    "Interior_CalfHutches": [],
    "Interior_Skybox": [],
    "Interior_Cows": []
}

def make_box(name, pos, size, bucket_name, mat):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pos)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(mat)
    int_buckets[bucket_name].append(obj)
    return obj

def make_cyl(name, pos, radius, depth, bucket_name, mat, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=radius, depth=depth, location=pos, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    obj.data.materials.append(mat)
    int_buckets[bucket_name].append(obj)
    return obj

def make_cow(name, pos, yaw=0.0, lying=False):
    import math
    cx, cy, cz = pos
    cos_a = math.cos(yaw)
    sin_a = math.sin(yaw)
    b_z = cz + (0.55 if lying else 1.15)
    b_size = (0.9, 1.8, 0.85) if not lying else (1.1, 1.8, 0.7)
    make_box(f"{name}_Body", (cx, cy, b_z), b_size, "Interior_Cows", mat_cow_white)
    make_box(f"{name}_Patch1", (cx + 0.15*cos_a, cy + 0.15*sin_a, b_z + 0.1), (0.75, 0.8, 0.86), "Interior_Cows", mat_cow_black)
    h_dist = 1.05
    h_x = cx - sin_a * h_dist
    h_y = cy + cos_a * h_dist
    h_z = cz + (0.7 if lying else 1.35)
    make_box(f"{name}_Neck", (h_x, h_y, h_z), (0.45, 0.5, 0.5), "Interior_Cows", mat_cow_white)
    make_box(f"{name}_Head", (h_x - sin_a * 0.3, h_y + cos_a * 0.3, h_z + 0.1), (0.38, 0.45, 0.4), "Interior_Cows", mat_cow_black)
    make_box(f"{name}_Muzzle", (h_x - sin_a * 0.55, h_y + cos_a * 0.55, h_z), (0.3, 0.25, 0.25), "Interior_Cows", mat_cow_pink)
    if not lying:
        for lx in [-0.3, 0.3]:
            for ly in [-0.65, 0.65]:
                leg_x = cx + lx * cos_a - ly * sin_a
                leg_y = cy + lx * sin_a + ly * cos_a
                make_cyl(f"{name}_Leg", (leg_x, leg_y, cz + 0.45), 0.08, 0.9, "Interior_Cows", mat_cow_white)
    else:
        make_box(f"{name}_LegFold", (cx + 0.45*cos_a, cy, cz + 0.2), (0.35, 1.6, 0.3), "Interior_Cows", mat_cow_white)

# 1. 5x LELY ASTRONAUT MELKROBOTS & TUSSENLID (B10 SPECIFICATION)
robot_positions = [
    (18.2, 38.0, 0.0, 0, "Robot_1_Bestaand"),
    (26.2, 58.0, 0.0, 3.14159, "Robot_2_Tussenlid_Zuid"),
    (26.2, 63.5, 0.0, 3.14159, "Robot_3_Tussenlid_Zuid"),
    (17.8, 58.0, 0.0, 0, "Robot_4_Tussenlid_Noord"),
    (17.8, 63.5, 0.0, 0, "Robot_5_Tussenlid_Noord"),
]

for idx, (rx, ry, rz, rrot, rname) in enumerate(robot_positions):
    pfx = f"Lely_{rname}"
    make_box(f"{pfx}_Frame", (rx, ry, rz + 0.95), (1.1, 2.3, 1.9), "Interior_Stainless", mat_stainless)
    make_box(f"{pfx}_RedCover", (rx, ry, rz + 1.95), (1.12, 2.32, 0.15), "Interior_LelyRed", mat_lely_red)
    make_box(f"{pfx}_RedSide", (rx + (0.55 if rrot==0 else -0.55), ry, rz + 1.1), (0.05, 2.32, 1.6), "Interior_LelyRed", mat_lely_red)
    feed_y = ry + (0.9 if rrot==0 else -0.9)
    make_box(f"{pfx}_Trough", (rx, feed_y, rz + 0.6), (0.7, 0.45, 0.65), "Interior_Stainless", mat_stainless)
    arm_y = ry - (0.3 if rrot==0 else -0.3)
    make_box(f"{pfx}_ArmBase", (rx + (0.3 if rrot==0 else -0.3), arm_y, rz + 0.35), (0.45, 0.25, 0.25), "Interior_Stainless", mat_stainless)
    make_cyl(f"{pfx}_LaserCluster", (rx, arm_y, rz + 0.45), 0.12, 0.25, "Interior_LelyRed", mat_lely_red)
    make_cyl(f"{pfx}_MilkJar", (rx + (0.45 if rrot==0 else -0.45), ry - 0.7, rz + 1.2), 0.14, 0.45, "Interior_Skybox", mat_skybox_glass)
    make_cyl(f"{pfx}_Pipe", (rx + (0.45 if rrot==0 else -0.45), ry - 0.7, rz + 1.65), 0.03, 0.5, "Interior_Stainless", mat_stainless)
    make_cyl(f"{pfx}_FeedAuger", (rx, ry, rz + 2.4), 0.08, 3.2, "Interior_Steel", mat_steel, rot=(0, 1.5708, 0))
    chute_x = rx - (0.75 if rrot==0 else -0.75)
    make_box(f"{pfx}_Chute_Entry", (chute_x, ry - 0.9, rz + 0.7), (0.06, 1.4, 1.2), "Interior_Steel", mat_steel)
    make_box(f"{pfx}_Chute_Exit", (chute_x, ry + 0.9, rz + 0.7), (0.06, 1.4, 1.2), "Interior_Steel", mat_steel)

make_cow("Cow_Milking_Robot1", (18.2, 38.0, 0.0), yaw=0.0, lying=False)
make_cow("Cow_Milking_Robot4", (17.8, 58.0, 0.0), yaw=0.0, lying=False)

for gy in [55.0, 60.5, 66.0]:
    make_box(f"Gate_Cross_{gy}", (22.0, gy, 0.65), (8.2, 0.08, 1.2), "Interior_Steel", mat_steel)
for gx in [16.8, 22.0, 27.2]:
    make_box(f"Gate_Long_{gx}", (gx, 60.5, 0.65), (0.08, 11.2, 1.2), "Interior_Steel", mat_steel)

make_box("Treatment_Crush_Frame", (22.0, 53.5, 0.95), (1.1, 2.4, 1.9), "Interior_Steel", mat_steel)
make_box("Treatment_Crush_Headgate", (22.0, 54.6, 0.95), (0.9, 0.08, 1.8), "Interior_Steel", mat_steel)
make_box("Treatment_Crush_Belt", (22.0, 53.5, 0.8), (0.8, 0.6, 0.2), "Interior_Steel", mat_steel)

make_box("PC_Floor_Slab", (22.0, 60.5, 0.06), (3.0, 3.8, 0.12), "Interior_Concrete", mat_concrete_curb)
make_box("PC_Desk", (22.0, 60.5, 0.45), (1.6, 0.8, 0.75), "Interior_Skybox", mat_wooddesk)
make_box("PC_Monitor_1", (21.7, 60.5, 0.95), (0.45, 0.05, 0.35), "Interior_Stainless", mat_stainless)
make_box("PC_Monitor_2", (22.3, 60.5, 0.95), (0.45, 0.05, 0.35), "Interior_Stainless", mat_stainless)

silo_base_x = 45.8
silo_base_y = 59.0
make_box("Silobet_Pad", (silo_base_x, silo_base_y, 0.08), (3.2, 6.2, 0.16), "Interior_Concrete", mat_concrete_curb)
for s_idx, sy in enumerate([silo_base_y - 1.8, silo_base_y + 1.8]):
    pfx = f"Krachtvoersilo_Tussen_{s_idx+1}"
    make_cyl(f"{pfx}_Body", (silo_base_x, sy, 4.2), 1.15, 4.8, "Interior_Silos", mat_silo_white)
    make_cyl(f"{pfx}_Cone", (silo_base_x, sy, 1.3), 0.7, 1.2, "Interior_Silos", mat_silo_white)
    for lx in [-0.9, 0.9]:
        for ly in [-0.9, 0.9]:
            make_cyl(f"{pfx}_Leg", (silo_base_x + lx, sy + ly, 1.0), 0.06, 2.0, "Interior_Steel", mat_steel)
make_cyl("Silo_50m3_Body", (silo_base_x + 1.8, silo_base_y, 4.8), 1.55, 6.2, "Interior_Silos", mat_silo_white)
for lx in [-1.2, 1.2]:
    for ly in [-1.2, 1.2]:
        make_cyl(f"Silo_50m3_Leg", (silo_base_x + 1.8 + lx, silo_base_y + ly, 1.1), 0.08, 2.2, "Interior_Steel", mat_steel)
make_cyl("Auger_Main_Line", (35.0, silo_base_y, 2.8), 0.1, 22.0, "Interior_Steel", mat_steel, rot=(0, 1.5708, 0))

# 2. DUAL VOERSTOEPEN (EXTERNAL FEED ALLEYS), TRIOLIET RAIL & HEADING FENCES
nb_y_start = 64.0
nb_y_end = 143.5
nb_len = nb_y_end - nb_y_start
nb_mid_y = nb_y_start + nb_len / 2.0

make_box("Voerstoep_North_Floor", (2.2, nb_mid_y, 0.25), (4.4, nb_len, 0.50), "Interior_Concrete", mat_concrete_curb)
make_box("Voerstoep_North_Curb", (4.35, nb_mid_y, 0.35), (0.15, nb_len, 0.30), "Interior_Concrete", mat_concrete_curb)
make_box("Silage_North_Alley", (3.4, nb_mid_y, 0.52), (1.1, nb_len, 0.25), "Interior_Silage", mat_silage)

make_box("Voerstoep_South_Floor", (41.6, nb_mid_y, 0.25), (4.4, nb_len, 0.50), "Interior_Concrete", mat_concrete_curb)
make_box("Voerstoep_South_Curb", (39.45, nb_mid_y, 0.35), (0.15, nb_len, 0.30), "Interior_Concrete", mat_concrete_curb)
make_box("Silage_South_Alley", (40.4, nb_mid_y, 0.52), (1.1, nb_len, 0.25), "Interior_Silage", mat_silage)

for x_fence, side in [(4.4, "North"), (39.4, "South")]:
    make_box(f"Feed_Fence_Top_{side}", (x_fence, nb_mid_y, 1.20), (0.08, nb_len, 0.08), "Interior_Steel", mat_steel)
    make_box(f"Feed_Fence_Bottom_{side}", (x_fence, nb_mid_y, 0.32), (0.08, nb_len, 0.08), "Interior_Steel", mat_steel)
    posts = int(nb_len / 2.4)
    for p in range(posts + 1):
        py = nb_y_start + p * 2.4
        make_cyl(f"Feed_Post_{side}_{p}", (x_fence, py, 0.65), 0.045, 1.3, "Interior_Steel", mat_steel)
        if p < posts:
            make_cyl(f"Headlock_{side}_{p}", (x_fence, py + 1.2, 0.74), 0.025, 0.92, "Interior_Steel", mat_steel, rot=(0, 0.20 if side=="North" else -0.20, 0))

for x_rail in [3.8, 40.0]:
    make_box(f"Trioliet_Rail_{x_rail}", (x_rail, nb_mid_y, 4.8), (0.12, nb_len, 0.20), "Interior_Steel", mat_steel)
make_box("Trioliet_Robot_Body", (40.0, 95.0, 4.2), (1.4, 2.6, 1.1), "Interior_Stainless", mat_stainless)
make_box("Trioliet_Robot_TopHanger", (40.0, 95.0, 4.75), (0.3, 0.8, 0.3), "Interior_Steel", mat_steel)
make_box("Trioliet_Robot_Discharge", (39.5, 95.0, 3.75), (0.4, 1.2, 0.3), "Interior_Silage", mat_silage)

# 3. PREFAB DIEPSTROOISEL LIGBOXEN (272 KOEIEN, GROEP 1 & 2 B10)
cubicle_double_rows = [
    (9.2, 11.6, "Groep1_RowA"),
    (15.8, 18.2, "Groep1_RowB"),
    (25.6, 28.0, "Groep2_RowC"),
    (32.2, 34.6, "Groep2_RowD"),
]

for x1, x2, rname in cubicle_double_rows:
    for rx in [x1, x2]:
        make_box(f"Diepstrooisel_{rname}_{rx}", (rx, nb_mid_y, 0.12), (2.2, nb_len, 0.22), "Interior_Straw", mat_straw)
        make_box(f"Schoftboom_{rname}_{rx}", (rx, nb_mid_y, 1.10), (0.06, nb_len, 0.06), "Interior_Steel", mat_steel)
        make_box(f"Knieboom_{rname}_{rx}", (rx, nb_mid_y, 0.25), (0.06, nb_len, 0.14), "Interior_Steel", mat_steel)
        div_step = 1.20
        divs = int(nb_len / div_step)
        for d in range(divs + 1):
            dy = nb_y_start + d * div_step
            make_box(f"Div_{rname}_{rx}_{d}", (rx, dy, 0.72), (2.1, 0.05, 0.80), "Interior_Steel", mat_steel)

for alley_x in [7.0, 13.7, 21.9, 30.1, 36.8]:
    for sy in range(int(nb_y_start + 4.0), int(nb_y_end - 4.0), 6):
        make_cyl(f"LelySphere_{alley_x}_{sy}", (alley_x, float(sy), 0.04), 0.15, 0.08, "Interior_Concrete", mat_lely_sphere)

crossover_ys = [75.0, 95.0, 115.0, 135.0]
for idx, cy in enumerate(crossover_ys):
    make_box(f"Water_Trough_N_{idx}", (13.7, cy, 0.45), (0.6, 2.2, 0.45), "Interior_Stainless", mat_stainless)
    make_box(f"Water_Surface_N_{idx}", (13.7, cy, 0.62), (0.54, 2.14, 0.05), "Interior_Skybox", mat_skybox_glass)
    make_box(f"Water_Trough_S_{idx}", (30.1, cy, 0.45), (0.6, 2.2, 0.45), "Interior_Stainless", mat_stainless)
    make_box(f"Water_Surface_S_{idx}", (30.1, cy, 0.62), (0.54, 2.14, 0.05), "Interior_Skybox", mat_skybox_glass)
    for bx in [13.7, 30.1]:
        make_box(f"Brush_Arm_{bx}_{idx}", (bx, cy + 2.5, 1.9), (0.65, 0.08, 0.08), "Interior_Steel", mat_steel)
        make_cyl(f"Brush_Roller_{bx}_{idx}", (bx + 0.35, cy + 2.5, 1.45), 0.28, 0.75, "Interior_Straw", mat_straw)

# 4. BESTAANDE STAL TE RENOVEREN (B10 As 1 to 16, Y: 6.0 to 57.6)
ex_y_start = 6.0
ex_y_end = 52.0
ex_len = ex_y_end - ex_y_start
ex_mid_y = ex_y_start + ex_len / 2.0

for rx in [9.5, 11.9]:
    make_box(f"Mattress_DryCows_{rx}", (rx, ex_mid_y, 0.12), (2.4, ex_len, 0.20), "Interior_CowMats", mat_cowmat)
    make_box(f"Schoftboom_Dry_{rx}", (rx, ex_mid_y, 1.10), (0.06, ex_len, 0.06), "Interior_Steel", mat_steel)
    div_step = 1.30
    divs = int(ex_len / div_step)
    for d in range(divs + 1):
        dy = ex_y_start + d * div_step
        make_box(f"Div_Dry_{rx}_{d}", (rx, dy, 0.72), (2.3, 0.05, 0.78), "Interior_Steel", mat_steel)

make_box("Mattress_Milking30", (32.5, ex_mid_y, 0.12), (2.2, ex_len, 0.20), "Interior_CowMats", mat_cowmat)
make_box("Schoftboom_Milking30", (32.5, ex_mid_y, 1.10), (0.06, ex_len, 0.06), "Interior_Steel", mat_steel)
div_step = 1.20
for d in range(int(ex_len / div_step) + 1):
    dy = ex_y_start + d * div_step
    make_box(f"Div_Milking30_{d}", (32.5, dy, 0.72), (2.1, 0.05, 0.78), "Interior_Steel", mat_steel)

make_box("Calving_Straw_Bed", (3.75, 31.0, 0.14), (5.5, 38.0, 0.26), "Interior_Straw", mat_straw)
for py in [12.0, 21.5, 31.0, 40.5, 50.0]:
    make_box(f"Calving_Gate_{py}", (3.75, py, 0.65), (5.5, 0.08, 1.2), "Interior_Steel", mat_steel)
make_box("Calving_FeedFence", (6.5, 31.0, 0.65), (0.08, 38.0, 1.2), "Interior_Steel", mat_steel)

# 5. KOPGEVEL NIEUWBOUW: RESEARCH LAB, AIR TREATMENT & SILO PARK (B10 As 33-34)
kop_mid_y = 153.5
make_box("Research_AirTreat_Floor", (13.75, kop_mid_y, 0.08), (14.5, 19.0, 0.16), "Interior_Concrete", mat_concrete_curb)
for idx, (sc_x, sc_y) in enumerate([(9.5, 148.0), (13.75, 148.0), (18.0, 148.0)]):
    pfx = f"AirScrubber_{idx+1}"
    make_cyl(f"{pfx}_Col", (sc_x, sc_y, 2.2), 1.05, 4.2, "Interior_Stainless", mat_stainless)
    make_cyl(f"{pfx}_Duct", (sc_x, sc_y, 4.4), 0.35, 1.2, "Interior_Steel", mat_steel)
    make_cyl(f"{pfx}_Pump", (sc_x, sc_y + 1.2, 0.4), 0.25, 0.7, "Interior_LelyRed", mat_lely_red)
make_cyl("Scrubber_Main_Duct", (13.75, 148.0, 4.9), 0.45, 9.0, "Interior_Steel", mat_steel, rot=(0, 1.5708, 0))

make_box("Researcher_Desk", (13.75, 156.0, 0.45), (2.4, 0.9, 0.75), "Interior_Skybox", mat_wooddesk)
make_box("Researcher_Gas_Analyzer", (13.0, 156.0, 0.95), (0.6, 0.4, 0.45), "Interior_Stainless", mat_stainless)
make_box("Researcher_Monitor", (14.2, 156.0, 0.95), (0.5, 0.05, 0.35), "Interior_Stainless", mat_stainless)

make_box("Opslag_Floor", (29.5, kop_mid_y, 0.08), (15.0, 19.0, 0.16), "Interior_Concrete", mat_concrete_curb)
for rk_x in [25.0, 34.0]:
    make_box(f"Pallet_Rack_{rk_x}", (rk_x, kop_mid_y, 1.8), (1.1, 14.0, 3.4), "Interior_Steel", mat_steel)
    for rk_y in [148.0, 153.0, 158.0]:
        make_box(f"Pallet_Load_{rk_x}_{rk_y}", (rk_x, float(rk_y), 0.7), (0.9, 1.2, 0.8), "Interior_Straw", mat_straw)
        make_box(f"Pallet_Load_High_{rk_x}_{rk_y}", (rk_x, float(rk_y), 2.1), (0.9, 1.2, 0.8), "Interior_Silage", mat_silage)

make_box("Silovoet_3x12_Pad", (22.0, 166.5, 0.08), (12.0, 3.2, 0.16), "Interior_Concrete", mat_concrete_curb)
for idx, sx in enumerate([18.0, 22.0, 26.0]):
    pfx = f"Kop_Silo_{idx+1}"
    make_cyl(f"{pfx}_Body", (sx, 166.5, 4.5), 1.2, 5.2, "Interior_Silos", mat_silo_white)
    make_cyl(f"{pfx}_Cone", (sx, 166.5, 1.4), 0.75, 1.2, "Interior_Silos", mat_silo_white)
    for lx in [-0.95, 0.95]:
        for ly in [-0.95, 0.95]:
            make_cyl(f"{pfx}_Leg", (sx + lx, 166.5 + ly, 1.1), 0.07, 2.2, "Interior_Steel", mat_steel)

# 6. SKYBOX & HERDMANAGER OFFICE (VERDIEPING B11 Y: 57.6..64.6, Z: 4.2)
skybox_y = 60.5
skybox_z = 4.2
make_box("Skybox_Floor", (22.0, skybox_y, skybox_z), (14.0, 7.0, 0.25), "Interior_Stainless", mat_stainless)
make_box("Skybox_Glass_North", (22.0, skybox_y + 3.45, skybox_z + 0.65), (13.8, 0.06, 1.15), "Interior_Skybox", mat_skybox_glass)
make_box("Skybox_Glass_South", (22.0, skybox_y - 3.45, skybox_z + 0.65), (13.8, 0.06, 1.15), "Interior_Skybox", mat_skybox_glass)
make_box("Skybox_Railing_N", (22.0, skybox_y + 3.45, skybox_z + 1.24), (14.0, 0.08, 0.05), "Interior_Steel", mat_steel)
make_box("Skybox_Railing_S", (22.0, skybox_y - 3.45, skybox_z + 1.24), (14.0, 0.08, 0.05), "Interior_Steel", mat_steel)

make_box("Office_Desk_1", (19.0, skybox_y, skybox_z + 0.45), (1.6, 0.8, 0.75), "Interior_Skybox", mat_wooddesk)
make_box("Office_Desk_2", (25.0, skybox_y, skybox_z + 0.45), (1.6, 0.8, 0.75), "Interior_Skybox", mat_wooddesk)
make_box("Monitor_1", (19.0, skybox_y, skybox_z + 0.95), (0.5, 0.05, 0.35), "Interior_Stainless", mat_stainless)
make_box("Monitor_2", (25.0, skybox_y, skybox_z + 0.95), (0.5, 0.05, 0.35), "Interior_Stainless", mat_stainless)
make_box("Meeting_Table", (22.0, skybox_y, skybox_z + 0.45), (2.4, 1.2, 0.75), "Interior_Skybox", mat_wooddesk)

make_box("Skybox_Walkway_Bridge", (36.5, 64.6, skybox_z), (15.0, 1.6, 0.22), "Interior_Stainless", mat_stainless)
make_box("Skybox_Walkway_Railing_N", (36.5, 65.35, skybox_z + 0.60), (15.0, 0.06, 1.15), "Interior_Steel", mat_steel)
make_box("Skybox_Walkway_Railing_S", (36.5, 63.85, skybox_z + 0.60), (15.0, 0.06, 1.15), "Interior_Steel", mat_steel)

# 7. CALF REARING & MILKTAXI (LOODS 1: X ~ 68.5, Y ~ 5.0)
calf_base_x = 68.5
calf_base_y = 5.0
make_box("Calf_Group_Straw_1", (calf_base_x - 3.5, calf_base_y + 12.0, 0.10), (7.0, 8.0, 0.18), "Interior_Straw", mat_straw)
make_box("Calf_Group_Straw_2", (calf_base_x - 3.5, calf_base_y + 3.0,  0.10), (7.0, 8.0, 0.18), "Interior_Straw", mat_straw)
make_box("Calf_Group_Straw_3", (calf_base_x - 3.5, calf_base_y - 6.0,  0.10), (7.0, 8.0, 0.18), "Interior_Straw", mat_straw)
make_box("Calf_Group_Straw_4", (calf_base_x - 3.5, calf_base_y - 15.0, 0.10), (7.0, 8.0, 0.18), "Interior_Straw", mat_straw)

for py in [calf_base_y + 16.0, calf_base_y + 7.5, calf_base_y - 1.5, calf_base_y - 10.5, calf_base_y - 19.5]:
    make_box(f"Calf_Gate_{py}", (calf_base_x - 3.5, py, 0.55), (7.0, 0.06, 1.0), "Interior_Steel", mat_steel)

for c, ch_y in enumerate([calf_base_y + 14.0, calf_base_y + 10.0, calf_base_y + 6.0, calf_base_y + 2.0,
                          calf_base_y - 2.0, calf_base_y - 6.0, calf_base_y - 10.0, calf_base_y - 14.0]):
    make_box(f"Calf_Hutch_{c}", (calf_base_x + 1.8, ch_y, 0.75), (1.5, 2.2, 1.4), "Interior_CalfHutches", mat_calfhutch)
    make_box(f"Calf_Pen_Fence_{c}", (calf_base_x + 2.2, ch_y, 0.5), (1.4, 2.1, 0.9), "Interior_Steel", mat_steel)
    make_cyl(f"Milk_Bucket_{c}", (calf_base_x + 2.65, ch_y, 0.35), 0.14, 0.28, "Interior_CalfHutches", mat_bucket)

mt_x = calf_base_x + 1.2
mt_y = calf_base_y + 2.0
make_cyl("MilkTaxi_Tank", (mt_x, mt_y, 0.75), 0.40, 0.85, "Interior_Stainless", mat_stainless)
make_box("MilkTaxi_Frame", (mt_x, mt_y, 0.28), (0.95, 0.95, 0.2), "Interior_Steel", mat_steel)
make_cyl("MilkTaxi_Handle", (mt_x - 0.45, mt_y, 1.05), 0.025, 0.6, "Interior_Steel", mat_steel, rot=(0, 0.4, 0))
make_cyl("MilkTaxi_Wheel_L", (mt_x + 0.38, mt_y - 0.45, 0.2), 0.2, 0.08, "Interior_CalfHutches", mat_bucket, rot=(1.5708, 0, 0))
make_cyl("MilkTaxi_Wheel_R", (mt_x + 0.38, mt_y + 0.45, 0.2), 0.2, 0.08, "Interior_CalfHutches", mat_bucket, rot=(1.5708, 0, 0))
make_cyl("MilkTaxi_Wheel_Front", (mt_x - 0.38, mt_y, 0.15), 0.15, 0.08, "Interior_CalfHutches", mat_bucket, rot=(1.5708, 0, 0))
make_cyl("MilkTaxi_DoserGun", (mt_x, mt_y + 0.38, 0.95), 0.03, 0.35, "Interior_LelyRed", mat_lely_red)

make_box("Calf_Feeder_Station", (calf_base_x - 6.5, calf_base_y + 7.5, 0.9), (1.0, 1.0, 1.6), "Interior_Stainless", mat_stainless)
make_box("Spoelplaats_Sink", (calf_base_x - 6.5, calf_base_y - 10.0, 0.5), (1.2, 2.0, 0.8), "Interior_Stainless", mat_stainless)
make_box("Spoelplaats_Boiler", (calf_base_x - 6.8, calf_base_y - 12.0, 1.4), (0.6, 0.6, 1.4), "Interior_Stainless", mat_stainless)

# 8. INDOOR COWS (BLUEPRINT LOCATIONS)
cow_feed_locs = [
    (4.1, 75.0, 1.57), (4.1, 88.0, 1.57), (4.1, 102.0, 1.57), (4.1, 118.0, 1.57), (4.1, 132.0, 1.57),
    (39.7, 78.0, -1.57), (39.7, 92.0, -1.57), (39.7, 106.0, -1.57), (39.7, 122.0, -1.57), (39.7, 136.0, -1.57)
]
for c_idx, (cx, cy, cyaw) in enumerate(cow_feed_locs):
    make_cow(f"Cow_Feed_{c_idx}", (cx, cy, 0.0), yaw=cyaw, lying=False)

cow_cubicle_locs = [
    (9.2, 80.0, 3.14), (9.2, 105.0, 3.14), (9.2, 128.0, 3.14),
    (11.6, 85.0, 0.0), (11.6, 110.0, 0.0), (11.6, 134.0, 0.0),
    (15.8, 82.0, 3.14), (15.8, 108.0, 3.14), (15.8, 130.0, 3.14),
    (18.2, 86.0, 0.0), (18.2, 112.0, 0.0), (18.2, 136.0, 0.0),
    (25.6, 80.0, 3.14), (25.6, 104.0, 3.14), (25.6, 126.0, 3.14),
    (28.0, 84.0, 0.0), (28.0, 108.0, 0.0), (28.0, 132.0, 0.0),
    (32.2, 82.0, 3.14), (32.2, 106.0, 3.14), (32.2, 130.0, 3.14),
    (34.6, 86.0, 0.0), (34.6, 112.0, 0.0), (34.6, 136.0, 0.0),
]
for c_idx, (cx, cy, cyaw) in enumerate(cow_cubicle_locs):
    make_cow(f"Cow_Cubicle_{c_idx}", (cx, cy, 0.12), yaw=cyaw, lying=True)

make_cow("Cow_Maternity_1", (3.75, 18.0, 0.14), yaw=0.8, lying=True)
make_cow("Cow_Maternity_2", (3.75, 28.0, 0.14), yaw=0.0, lying=False)
make_cow("Cow_Maternity_3", (3.75, 38.0, 0.14), yaw=-0.5, lying=True)

for bname, bobjs in int_buckets.items():
    if not bobjs: continue
    bpy.ops.object.select_all(action="DESELECT")
    for o in bobjs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = bobjs[0]
    if len(bobjs) > 1:
        bpy.ops.object.join()
    j_obj = bobjs[0]
    j_obj.name = f"Campus_{bname}"
    joined_objects.append(j_obj)
    print(f"-> Joined {j_obj.name}: {len(j_obj.data.polygons)} polygons")

# -------------------------------------------------------------
# 9. EXPORT OPTIMIZED GLB
# -------------------------------------------------------------
out_path = '/Users/bert/dev/barnsimulation/roblox/barn_textured.glb'
print(f"Exporting complete GLB to {out_path}...")

bpy.ops.object.select_all(action='DESELECT')
for o in joined_objects:
    o.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_normals=True,
    export_image_format='AUTO',
    export_yup=True
)

file_size_mb = os.path.getsize(out_path) / (1024 * 1024)
print(f"=== Done! Complete barn_textured.glb generated! Size: {file_size_mb:.2f} MB ===")

