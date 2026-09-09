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
# GENERATE FULL ARCHITECTURAL STALINRICHTING (FROM DLV BLUEPRINTS)
# =============================================================
print('=== Generating Complete Blueprint Stalinrichting ===')

mat_steel = create_textured_material('GalvSteel', (0.78, 0.80, 0.82), 0.35, 0.85)
mat_lely_red = create_textured_material('LelyRed', (0.78, 0.06, 0.12), 0.35, 0.1)
mat_stainless = create_textured_material('Stainless', (0.88, 0.90, 0.92), 0.2, 0.92)
mat_straw = create_textured_material('Straw', (0.85, 0.72, 0.32), 0.9, 0.0, 6.0)
mat_silage = create_textured_material('Silage', (0.35, 0.45, 0.18), 0.95, 0.0, 8.0)
mat_cowmat = create_textured_material('CowMat', (0.18, 0.28, 0.18), 0.85, 0.05)
mat_calfhutch = create_textured_material('CalfHutch', (0.95, 0.96, 0.96), 0.3, 0.05)
mat_bucket = create_textured_material('BucketRed', (0.85, 0.15, 0.10), 0.4, 0.05)
mat_skybox_glass = create_textured_material('SkyboxGlass', (0.68, 0.84, 0.95), 0.1, 0.1, 1.0, 0.35)
mat_wooddesk = create_textured_material('WoodDesk', (0.58, 0.38, 0.22), 0.6, 0.05)
mat_cow_black = create_textured_material('CowBlack', (0.08, 0.08, 0.08), 0.7, 0.05)
mat_cow_white = create_textured_material('CowWhite', (0.92, 0.92, 0.90), 0.7, 0.05)
mat_cow_pink = create_textured_material('CowPink', (0.92, 0.65, 0.65), 0.5, 0.05)

int_buckets = {
    'Interior_Steel': [],
    'Interior_LelyRed': [],
    'Interior_Stainless': [],
    'Interior_Straw': [],
    'Interior_Silage': [],
    'Interior_CowMats': [],
    'Interior_CalfHutches': [],
    'Interior_Skybox': [],
    'Interior_Cows': []
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

# Helper to create a stylized Holstein cow
def make_cow(name, pos, yaw=0.0, lying=False):
    cx, cy, cz = pos
    cos_a = math.cos(yaw)
    sin_a = math.sin(yaw)
    
    # Body
    b_z = cz + (0.55 if lying else 1.15)
    b_size = (0.9, 1.8, 0.85) if not lying else (1.1, 1.8, 0.7)
    make_box(f'{name}_Body', (cx, cy, b_z), b_size, 'Interior_Cows', mat_cow_white)
    
    # Black patches on body
    make_box(f'{name}_Patch1', (cx + 0.15*cos_a, cy + 0.15*sin_a, b_z + 0.1), (0.75, 0.8, 0.86), 'Interior_Cows', mat_cow_black)
    
    # Head & Neck
    h_dist = 1.05
    h_x = cx - sin_a * h_dist
    h_y = cy + cos_a * h_dist
    h_z = cz + (0.7 if lying else 1.35)
    make_box(f'{name}_Neck', (h_x, h_y, h_z), (0.45, 0.5, 0.5), 'Interior_Cows', mat_cow_white)
    make_box(f'{name}_Head', (h_x - sin_a * 0.3, h_y + cos_a * 0.3, h_z + 0.1), (0.38, 0.45, 0.4), 'Interior_Cows', mat_cow_black)
    make_box(f'{name}_Muzzle', (h_x - sin_a * 0.55, h_y + cos_a * 0.55, h_z), (0.3, 0.25, 0.25), 'Interior_Cows', mat_cow_pink)
    
    # Legs (if standing)
    if not lying:
        for lx in [-0.3, 0.3]:
            for ly in [-0.65, 0.65]:
                leg_x = cx + lx * cos_a - ly * sin_a
                leg_y = cy + lx * sin_a + ly * cos_a
                make_cyl(f'{name}_Leg', (leg_x, leg_y, cz + 0.45), 0.08, 0.9, 'Interior_Cows', mat_cow_white)
    else:
        # Lying folded legs
        make_box(f'{name}_LegFold', (cx + 0.45*cos_a, cy, cz + 0.2), (0.35, 1.6, 0.3), 'Interior_Cows', mat_cow_white)

# -------------------------------------------------------------
# 1. 4x LELY ASTRONAUT MELKROBOTS (Tussenlid Y: 56..64, X: 17..27)
# -------------------------------------------------------------
robot_positions = [
    (18.2, 58.0, 0.0, 0),
    (18.2, 63.5, 0.0, 0),
    (25.8, 58.0, 0.0, 3.14159),
    (25.8, 63.5, 0.0, 3.14159),
]

for idx, (rx, ry, rz, rrot) in enumerate(robot_positions):
    pfx = f'Lely_Robot_{idx+1}'
    make_box(f'{pfx}_Frame', (rx, ry, rz + 0.95), (1.1, 2.3, 1.9), 'Interior_Stainless', mat_stainless)
    make_box(f'{pfx}_RedCover', (rx, ry, rz + 1.95), (1.12, 2.32, 0.15), 'Interior_LelyRed', mat_lely_red)
    make_box(f'{pfx}_RedSide', (rx + (0.55 if rrot==0 else -0.55), ry, rz + 1.1), (0.05, 2.32, 1.6), 'Interior_LelyRed', mat_lely_red)
    feed_y = ry + (0.9 if rrot==0 else -0.9)
    make_box(f'{pfx}_Trough', (rx, feed_y, rz + 0.6), (0.7, 0.45, 0.65), 'Interior_Stainless', mat_stainless)
    arm_y = ry - (0.3 if rrot==0 else -0.3)
    make_box(f'{pfx}_ArmBase', (rx + (0.3 if rrot==0 else -0.3), arm_y, rz + 0.35), (0.45, 0.25, 0.25), 'Interior_Stainless', mat_stainless)
    make_cyl(f'{pfx}_LaserCluster', (rx, arm_y, rz + 0.45), 0.12, 0.25, 'Interior_LelyRed', mat_lely_red)
    make_cyl(f'{pfx}_MilkJar', (rx + (0.45 if rrot==0 else -0.45), ry - 0.7, rz + 1.2), 0.14, 0.45, 'Interior_Skybox', mat_skybox_glass)
    make_cyl(f'{pfx}_Pipe', (rx + (0.45 if rrot==0 else -0.45), ry - 0.7, rz + 1.65), 0.03, 0.5, 'Interior_Stainless', mat_stainless)
    
    # Overhead concentrate feed auger (vijzel) connecting robot to silo line
    make_cyl(f'{pfx}_FeedAuger', (rx, ry, rz + 2.4), 0.08, 3.2, 'Interior_Steel', mat_steel, rot=(0, 1.5708, 0))

# Robot inside cow (Cow 1 being milked in Robot 1)
make_cow('Cow_Milking_Robot1', (18.2, 58.0, 0.0), yaw=0.0, lying=False)

# Waiting area & separation gates (B10 optrekhekken)
for gy in [55.0, 60.5, 66.0]:
    make_box(f'Gate_Cross_{gy}', (22.0, gy, 0.65), (7.8, 0.08, 1.2), 'Interior_Steel', mat_steel)
for gx in [17.2, 22.0, 26.8]:
    make_box(f'Gate_Long_{gx}', (gx, 60.5, 0.65), (0.08, 11.2, 1.2), 'Interior_Steel', mat_steel)

# 3-way Selection gate & Treatment crush (Behandelbox)
make_box('Treatment_Crush_Frame', (22.0, 54.0, 0.95), (1.1, 2.4, 1.9), 'Interior_Steel', mat_steel)
make_box('Treatment_Crush_Headgate', (22.0, 55.1, 0.95), (0.9, 0.1, 1.8), 'Interior_Steel', mat_steel)

# -------------------------------------------------------------
# 2. CENTRALE VOERGANG & VEILIGHEIDSVOERHEKKEN (Nieuwbouwstal Y: 66..162)
# -------------------------------------------------------------
feed_start_y = 66.0
feed_end_y = 162.0
feed_len = feed_end_y - feed_start_y
feed_mid_y = feed_start_y + feed_len / 2.0

# Central elevated feeding track (Voergang)
make_box('Feed_Alley_Floor', (22.0, feed_mid_y, 0.05), (4.5, feed_len, 0.08), 'Interior_Stainless', mat_stainless)

# Fresh silage feed along left and right side of feed fence
make_box('Silage_Feed_Left', (20.35, feed_mid_y, 0.24), (0.75, feed_len, 0.38), 'Interior_Silage', mat_silage)
make_box('Silage_Feed_Right', (23.65, feed_mid_y, 0.24), (0.75, feed_len, 0.38), 'Interior_Silage', mat_silage)

# Self-closing safety feed fences (Zelfsluitend voerhek)
for x_rail in [19.75, 24.25]:
    side = 'Left' if x_rail < 22 else 'Right'
    make_box(f'Feed_Fence_Top_{side}', (x_rail, feed_mid_y, 1.18), (0.08, feed_len, 0.08), 'Interior_Steel', mat_steel)
    make_box(f'Feed_Fence_Bottom_{side}', (x_rail, feed_mid_y, 0.30), (0.08, feed_len, 0.08), 'Interior_Steel', mat_steel)
    post_count = int(feed_len / 2.5)
    for p in range(post_count + 1):
        py = feed_start_y + p * 2.5
        make_cyl(f'Feed_Post_{side}_{p}', (x_rail, py, 0.65), 0.045, 1.3, 'Interior_Steel', mat_steel)
        if p < post_count:
            # Diagonal lockable feed neck bars
            make_cyl(f'Headlock_Bar_{side}_{p}', (x_rail, py + 1.25, 0.72), 0.025, 0.90, 'Interior_Steel', mat_steel, rot=(0, 0.20 if side=='Left' else -0.20, 0))

# -------------------------------------------------------------
# 3. FULL BLUEPRINT CUBICLE LAYOUT (6 ROWS IN NIEUWBOUW + 3 ROWS IN BESTAAND)
# -------------------------------------------------------------
# Nieuwbouw: 6 rows (Groep 1 Left, Groep 2 Right = 350+ ligboxen)
cubicle_rows_new = [
    # West Side (Groep 1)
    {'x': 2.4,  'w': 2.0, 'type': 'single', 'side': 'left'},
    {'x': 9.8,  'w': 2.2, 'type': 'head_to_head', 'side': 'left'},
    {'x': 12.0, 'w': 2.2, 'type': 'head_to_head', 'side': 'right'},
    # East Side (Groep 2)
    {'x': 32.0, 'w': 2.2, 'type': 'head_to_head', 'side': 'left'},
    {'x': 34.2, 'w': 2.2, 'type': 'head_to_head', 'side': 'right'},
    {'x': 41.6, 'w': 2.0, 'type': 'single', 'side': 'right'},
]

cubicle_start_y = 66.0
cubicle_end_y = 142.0
cubicle_len = cubicle_end_y - cubicle_start_y
cubicle_mid_y = cubicle_start_y + cubicle_len / 2.0

for r_idx, row in enumerate(cubicle_rows_new):
    rx = row['x']
    rw = row['w']
    # Green rubber cow mattress
    make_box(f'CowMattress_New_{r_idx}', (rx, cubicle_mid_y, 0.12), (rw, cubicle_len, 0.20), 'Interior_CowMats', mat_cowmat)
    # Head rail (schoftboom)
    make_box(f'Schoftboom_New_{r_idx}', (rx, cubicle_mid_y, 1.10), (0.06, cubicle_len, 0.06), 'Interior_Steel', mat_steel)
    # Brisket board (knieboom)
    make_box(f'Knieboom_New_{r_idx}', (rx, cubicle_mid_y, 0.24), (0.06, cubicle_len, 0.14), 'Interior_Steel', mat_steel)
    
    # R-shaped steel cubicle dividers every 1.25m
    div_step = 1.25
    div_count = int(cubicle_len / div_step)
    for d in range(div_count + 1):
        dy = cubicle_start_y + d * div_step
        # Divider upper bar
        make_box(f'Cubicle_R_{r_idx}_{d}', (rx, dy, 0.72), (rw * 0.96, 0.05, 0.78), 'Interior_Steel', mat_steel)

# Existing Renovated Barn (B10 Y: 6..52): 3 cubicle rows + Strohokken
cubicle_rows_exist = [
    {'x': 8.5,  'w': 2.2},
    {'x': 11.0, 'w': 2.2},
    {'x': 32.5, 'w': 2.2}
]
exist_start_y = 6.0
exist_end_y = 50.0
exist_len = exist_end_y - exist_start_y
exist_mid_y = exist_start_y + exist_len / 2.0

for er_idx, erow in enumerate(cubicle_rows_exist):
    erx = erow['x']
    erw = erow['w']
    make_box(f'CowMattress_Exist_{er_idx}', (erx, exist_mid_y, 0.12), (erw, exist_len, 0.20), 'Interior_CowMats', mat_cowmat)
    make_box(f'Schoftboom_Exist_{er_idx}', (erx, exist_mid_y, 1.10), (0.06, exist_len, 0.06), 'Interior_Steel', mat_steel)
    div_step = 1.25
    div_count = int(exist_len / div_step)
    for d in range(div_count + 1):
        dy = exist_start_y + d * div_step
        make_box(f'Cubicle_Exist_R_{er_idx}_{d}', (erx, dy, 0.72), (erw * 0.96, 0.05, 0.78), 'Interior_Steel', mat_steel)

# -------------------------------------------------------------
# 4. CROSS-OVERS, DRINKING TROUGHS & ROTATING BRUSHES
# -------------------------------------------------------------
# 8 Drinking troughs located at cross-overs in new and existing barns
water_locs = [
    (16.5, 85.0, 0.45),  (27.5, 85.0, 0.45),
    (16.5, 110.0, 0.45), (27.5, 110.0, 0.45),
    (16.5, 135.0, 0.45), (27.5, 135.0, 0.45),
    (16.5, 25.0, 0.45),  (27.5, 25.0, 0.45)
]
for w_idx, (wx, wy, wz) in enumerate(water_locs):
    make_box(f'Water_Trough_{w_idx}', (wx, wy, wz), (0.6, 2.2, 0.45), 'Interior_Stainless', mat_stainless)
    make_box(f'Water_Surface_{w_idx}', (wx, wy, wz + 0.16), (0.54, 2.14, 0.05), 'Interior_Skybox', mat_skybox_glass)

# Rotating cow brushes (Lely Luna)
brush_locs = [
    (18.2, 75.0), (25.8, 75.0),
    (18.2, 100.0), (25.8, 100.0),
    (18.2, 125.0), (25.8, 125.0),
    (18.2, 35.0), (25.8, 35.0)
]
for br_idx, (brx, bry) in enumerate(brush_locs):
    make_box(f'Brush_Arm_{br_idx}', (brx, bry, 1.85), (0.65, 0.08, 0.08), 'Interior_Steel', mat_steel)
    make_cyl(f'Brush_Roller_{br_idx}', (brx + (0.38 if brx < 22 else -0.38), bry, 1.45), 0.28, 0.72, 'Interior_Straw', mat_straw)

# -------------------------------------------------------------
# 5. MATERNITY / CALVING PENS (STROHOKKEN / AFKALFSTAL B10)
# -------------------------------------------------------------
# Deep straw bed in existing barn West wing (X: 1..6, Y: 12..50)
make_box('Calving_Straw_Bed', (3.5, 31.0, 0.14), (5.0, 38.0, 0.26), 'Interior_Straw', mat_straw)
# Divider gates dividing maternity into 4 individual calving pens
for py in [12.0, 21.5, 31.0, 40.5, 50.0]:
    make_box(f'Calving_Pen_Gate_{py}', (3.5, py, 0.65), (5.0, 0.08, 1.2), 'Interior_Steel', mat_steel)
make_box('Calving_Front_FeedFence', (6.0, 31.0, 0.65), (0.08, 38.0, 1.2), 'Interior_Steel', mat_steel)

# -------------------------------------------------------------
# 6. SKYBOX & HERDMANAGER OFFICE (VERDIEPING B11 Y: 53..65, Z: 4.2)
# -------------------------------------------------------------
skybox_y = 59.0
skybox_z = 4.2
# Main floor plate
make_box('Skybox_Floor', (22.0, skybox_y, skybox_z), (14.0, 11.0, 0.25), 'Interior_Stainless', mat_stainless)

# Panoramic glass observation walls looking down North (over new barn) and South (over existing barn & robots)
make_box('Skybox_Glass_North', (22.0, skybox_y + 5.4, skybox_z + 0.65), (13.8, 0.06, 1.15), 'Interior_Skybox', mat_skybox_glass)
make_box('Skybox_Glass_South', (22.0, skybox_y - 5.4, skybox_z + 0.65), (13.8, 0.06, 1.15), 'Interior_Skybox', mat_skybox_glass)
make_box('Skybox_Railing_N', (22.0, skybox_y + 5.4, skybox_z + 1.24), (14.0, 0.08, 0.05), 'Interior_Steel', mat_steel)
make_box('Skybox_Railing_S', (22.0, skybox_y - 5.4, skybox_z + 1.24), (14.0, 0.08, 0.05), 'Interior_Steel', mat_steel)

# Herd manager office interior (desks, computers, chairs)
make_box('Office_Desk_1', (19.0, skybox_y, skybox_z + 0.45), (1.6, 0.8, 0.75), 'Interior_Skybox', mat_wooddesk)
make_box('Office_Desk_2', (25.0, skybox_y, skybox_z + 0.45), (1.6, 0.8, 0.75), 'Interior_Skybox', mat_wooddesk)
make_box('Monitor_1', (19.0, skybox_y, skybox_z + 0.95), (0.5, 0.05, 0.35), 'Interior_Stainless', mat_stainless)
make_box('Monitor_2', (25.0, skybox_y, skybox_z + 0.95), (0.5, 0.05, 0.35), 'Interior_Stainless', mat_stainless)
make_box('Meeting_Table', (22.0, skybox_y, skybox_z + 0.45), (2.4, 1.2, 0.75), 'Interior_Skybox', mat_wooddesk)

# Authentic walkway bridge connecting the real Autodesk Revit stairs (at X: 45.0, Y: 64.6) to the Skybox (Z = 4.2)
make_box('Skybox_Walkway_Bridge', (36.5, 64.6, skybox_z), (15.0, 1.6, 0.22), 'Interior_Stainless', mat_stainless)
make_box('Skybox_Walkway_Railing_N', (36.5, 65.35, skybox_z + 0.60), (15.0, 0.06, 1.15), 'Interior_Steel', mat_steel)
make_box('Skybox_Walkway_Railing_S', (36.5, 63.85, skybox_z + 0.60), (15.0, 0.06, 1.15), 'Interior_Steel', mat_steel)

# -------------------------------------------------------------
# 7. CALF REARING & MILKTAXI (PRAKTIJKRUIMTE V10 IN LOODS 1: X ~ 68.5, Y ~ 5.0)
# -------------------------------------------------------------
calf_base_x = 68.5
calf_base_y = 5.0

# 4 large group straw pens for weaned calves
make_box('Calf_Group_Straw_1', (calf_base_x - 3.5, calf_base_y + 12.0, 0.10), (7.0, 8.0, 0.18), 'Interior_Straw', mat_straw)
make_box('Calf_Group_Straw_2', (calf_base_x - 3.5, calf_base_y + 3.0,  0.10), (7.0, 8.0, 0.18), 'Interior_Straw', mat_straw)
make_box('Calf_Group_Straw_3', (calf_base_x - 3.5, calf_base_y - 6.0,  0.10), (7.0, 8.0, 0.18), 'Interior_Straw', mat_straw)
make_box('Calf_Group_Straw_4', (calf_base_x - 3.5, calf_base_y - 15.0, 0.10), (7.0, 8.0, 0.18), 'Interior_Straw', mat_straw)

# Group pen gates
for gpy in [calf_base_y + 16.0, calf_base_y + 7.5, calf_base_y - 1.5, calf_base_y - 10.5, calf_base_y - 19.5]:
    make_box(f'Calf_Group_Gate_{gpy}', (calf_base_x - 3.5, gpy, 0.55), (7.0, 0.06, 1.0), 'Interior_Steel', mat_steel)

# 22 Individual calf hutches (eenlingboxen / kalveriglo's) with red suckling buckets
for c in range(22):
    ch_y = calf_base_y - 20.0 + c * 1.8
    make_box(f'Calf_Hutch_{c}', (calf_base_x + 3.8, ch_y, 0.70), (1.9, 1.15, 1.2), 'Interior_CalfHutches', mat_calfhutch)
    make_box(f'Calf_Hutch_Straw_{c}', (calf_base_x + 3.8, ch_y, 0.12), (1.8, 1.05, 0.15), 'Interior_Straw', mat_straw)
    make_box(f'Calf_Hutch_Gate_{c}', (calf_base_x + 2.8, ch_y, 0.45), (0.05, 1.15, 0.8), 'Interior_Steel', mat_steel)
    make_cyl(f'Milk_Bucket_{c}', (calf_base_x + 2.65, ch_y, 0.35), 0.14, 0.28, 'Interior_CalfHutches', mat_bucket)

# MilkTaxi mobile feeding unit (mixing tank, dispenser, wheels)
mt_x = calf_base_x + 1.2
mt_y = calf_base_y + 2.0
make_cyl('MilkTaxi_Tank', (mt_x, mt_y, 0.75), 0.40, 0.85, 'Interior_Stainless', mat_stainless)
make_box('MilkTaxi_Frame', (mt_x, mt_y, 0.28), (0.95, 0.95, 0.2), 'Interior_Steel', mat_steel)
make_cyl('MilkTaxi_Handle', (mt_x - 0.45, mt_y, 1.05), 0.025, 0.6, 'Interior_Steel', mat_steel, rot=(0, 0.4, 0))
make_cyl('MilkTaxi_Wheel_L', (mt_x + 0.38, mt_y - 0.45, 0.2), 0.2, 0.08, 'Interior_CalfHutches', mat_bucket, rot=(1.5708, 0, 0))
make_cyl('MilkTaxi_Wheel_R', (mt_x + 0.38, mt_y + 0.45, 0.2), 0.2, 0.08, 'Interior_CalfHutches', mat_bucket, rot=(1.5708, 0, 0))
make_cyl('MilkTaxi_Wheel_Front', (mt_x - 0.38, mt_y, 0.15), 0.15, 0.08, 'Interior_CalfHutches', mat_bucket, rot=(1.5708, 0, 0))
make_cyl('MilkTaxi_DoserGun', (mt_x, mt_y + 0.38, 0.95), 0.03, 0.35, 'Interior_LelyRed', mat_lely_red)

# Automatic calf milk feeding station (drinkautomaat)
make_box('Calf_Feeder_Station', (calf_base_x - 6.5, calf_base_y + 7.5, 0.9), (1.0, 1.0, 1.6), 'Interior_Stainless', mat_stainless)

# Washing & preparation area (spoelplaats V35)
make_box('Spoelplaats_Sink', (calf_base_x - 6.5, calf_base_y - 10.0, 0.5), (1.2, 2.0, 0.8), 'Interior_Stainless', mat_stainless)
make_box('Spoelplaats_Boiler', (calf_base_x - 6.8, calf_base_y - 12.0, 1.4), (0.6, 0.6, 1.4), 'Interior_Stainless', mat_stainless)

# -------------------------------------------------------------
# 8. INDOOR COWS (LIVING BARN ATMOSPHERE)
# -------------------------------------------------------------
# Cows eating at the feed alley (Groep 1 Left & Groep 2 Right)
cow_feed_locs = [
    (18.9, 72.0, 1.57), (18.9, 82.0, 1.57), (18.9, 92.0, 1.57), (18.9, 102.0, 1.57),
    (18.9, 115.0, 1.57), (18.9, 128.0, 1.57), (18.9, 140.0, 1.57),
    (25.1, 74.0, -1.57), (25.1, 86.0, -1.57), (25.1, 98.0, -1.57), (25.1, 110.0, -1.57),
    (25.1, 122.0, -1.57), (25.1, 134.0, -1.57), (25.1, 146.0, -1.57)
]
for c_idx, (cx, cy, cyaw) in enumerate(cow_feed_locs):
    make_cow(f'Cow_Feed_{c_idx}', (cx, cy, 0.0), yaw=cyaw, lying=False)

# Cows lying resting in cubicles
cow_cubicle_locs = [
    # Row 1 (West wall)
    (2.4, 76.0, 0.0), (2.4, 90.0, 0.0), (2.4, 108.0, 0.0), (2.4, 124.0, 0.0),
    # Double row center (kop-aan-kop)
    (9.8, 78.0, 3.14), (9.8, 94.0, 3.14), (9.8, 114.0, 3.14), (9.8, 132.0, 3.14),
    (12.0, 80.0, 0.0), (12.0, 96.0, 0.0), (12.0, 116.0, 0.0), (12.0, 136.0, 0.0),
    # East double row
    (32.0, 78.0, 3.14), (32.0, 96.0, 3.14), (32.0, 118.0, 3.14), (32.0, 138.0, 3.14),
    (34.2, 82.0, 0.0), (34.2, 100.0, 0.0), (34.2, 120.0, 0.0), (34.2, 142.0, 0.0),
    # East wall
    (41.6, 75.0, 3.14), (41.6, 92.0, 3.14), (41.6, 110.0, 3.14), (41.6, 126.0, 3.14)
]
for c_idx, (cx, cy, cyaw) in enumerate(cow_cubicle_locs):
    make_cow(f'Cow_Cubicle_{c_idx}', (cx, cy, 0.12), yaw=cyaw, lying=True)

# Maternity / Calving cows on straw (B10)
make_cow('Cow_Maternity_1', (3.5, 18.0, 0.14), yaw=0.8, lying=True)
make_cow('Cow_Maternity_2', (3.5, 28.0, 0.14), yaw=0.0, lying=False)
make_cow('Cow_Maternity_3', (3.5, 38.0, 0.14), yaw=-0.5, lying=True)

# Consolidate each interior bucket into a single high-performance mesh
for bname, bobjs in int_buckets.items():
    if not bobjs: continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in bobjs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = bobjs[0]
    if len(bobjs) > 1:
        bpy.ops.object.join()
    j_obj = bobjs[0]
    j_obj.name = f'Campus_{bname}'
    joined_objects.append(j_obj)
    print(f'-> Joined {j_obj.name}: {len(j_obj.data.polygons)} polygons')

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

