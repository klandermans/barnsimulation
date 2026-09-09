import mathutils
import bpy
import os

print("=== Starting Blender Dairy Campus Optimization & Decimation ===")

# 1. Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Import Revit FBX
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
print(f"Importing {fbx_path}...")
bpy.ops.import_scene.fbx(filepath=fbx_path)

mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"Imported {len(mesh_objs)} meshes")

CATEGORIES = {
    'Roofs': ['dakplaten', 'Roof', 'dak', 'ontwerpdak', 'isolatie PIR', 'boeiboord', 'goot'],
    'Walls_Wood': ['houten geveldelen', 'geveldelen'],
    'Walls_Sandwich': ['sandwichpaneel', 'ontwerpwand'],
    'Walls_Brick': ['mw 100', 'metselwerk'],
    'Walls_Concrete': ['beton prefab', 'prefab 110'],
    'Floors_Water': ['water'],
    'Floors_Ground': ['grond', 'gras', 'weide'],
    'Floors_Paving': ['straatwerk', 'asfalt', 'klinkers'],
    'Floors_Concrete': ['beton ihwg', 'vloer', 'floor'],
    'Doors_Industrial': ['IndustrialDoor', 'DYNACO', 'sectional-overhead-doo', 'overhead', 'SpringPackage'],
    'Railings': ['spijlenhekwerk', 'Railing', 'hek'],
    'Silos': ['Silo', 'Tank', 'CPAC'],
    'Glass': ['glas 24mm', 'paneel glas'],
    'Mullions': ['Circular Mullion', 'Mullion', 'kozijn', 'gesloten paneel'],
    'Stairs_Structure': ['Stair', 'Trap', 'kolom', 'spant']
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
    'Walls_Wood': ((0.52, 0.12, 0.10), 0.65, 0.05, 8.0, 1.0),
    'Walls_Sandwich': ((0.82, 0.84, 0.85), 0.4, 0.1, 6.0, 1.0),
    'Walls_Brick': ((0.45, 0.20, 0.14), 0.85, 0.0, 12.0, 1.0),
    'Walls_Concrete': ((0.68, 0.70, 0.72), 0.75, 0.05, 1.0, 1.0),
    'Floors_Ground': ((0.28, 0.62, 0.22), 0.9, 0.0, 35.0, 1.0),
    'Floors_Paving': ((0.32, 0.33, 0.35), 0.8, 0.05, 15.0, 1.0),
    'Floors_Water': ((0.15, 0.40, 0.60), 0.15, 0.2, 8.0, 0.85),
    'Floors_Concrete': ((0.62, 0.64, 0.65), 0.7, 0.05, 12.0, 1.0),
    'Doors_Industrial': ((0.10, 0.35, 0.72), 0.35, 0.2, 1.0, 1.0),
    'Railings': ((0.75, 0.76, 0.78), 0.3, 0.75, 1.0, 1.0),
    'Silos': ((0.85, 0.87, 0.90), 0.25, 0.85, 8.0, 1.0),
    'Glass': ((0.65, 0.82, 0.95), 0.1, 0.1, 1.0, 0.35),
    'Mullions': ((0.20, 0.22, 0.25), 0.4, 0.6, 1.0, 1.0),
    'Stairs_Structure': ((0.42, 0.45, 0.48), 0.4, 0.7, 1.0, 1.0),
    'Other_Buildings': ((0.78, 0.78, 0.78), 0.6, 0.05, 1.0, 1.0)
}

DECIMATE_RATIOS = {
    'Mullions': 0.12,
    'Silos': 0.20,
    'Doors_Industrial': 0.25,
    'Railings': 0.25,
    'Roofs': 0.30,
    'Floors_Ground': 0.30,
    'Floors_Paving': 0.30,
    'Floors_Concrete': 0.30,
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
    
    # Merge duplicate vertices & smart unwrap
    try:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        # Merge vertices within 2cm to reduce microscopic CAD vertices
        bpy.ops.mesh.remove_doubles(threshold=0.02)
        # Smart UV Project
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
# GENERATE DETAILED STALINRICHTING (FROM DLV BLUEPRINTS B10, B11, V10)
# =============================================================
print('=== Generating Detailed Stalinrichting ===')

mat_steel = create_textured_material('GalvSteel', (0.78, 0.80, 0.82), 0.35, 0.85)
mat_lely_red = create_textured_material('LelyRed', (0.78, 0.06, 0.12), 0.35, 0.1)
mat_stainless = create_textured_material('Stainless', (0.88, 0.90, 0.92), 0.2, 0.92)
mat_straw = create_textured_material('Straw', (0.85, 0.72, 0.32), 0.9, 0.0, 6.0)
mat_silage = create_textured_material('Silage', (0.35, 0.45, 0.18), 0.95, 0.0, 8.0)
mat_cowmat = create_textured_material('CowMat', (0.22, 0.32, 0.22), 0.8, 0.05)
mat_calfhutch = create_textured_material('CalfHutch', (0.95, 0.96, 0.96), 0.3, 0.05)
mat_bucket = create_textured_material('BucketRed', (0.85, 0.15, 0.10), 0.4, 0.05)
mat_skybox_glass = create_textured_material('SkyboxGlass', (0.68, 0.84, 0.95), 0.1, 0.1, 1.0, 0.35)
mat_wooddesk = create_textured_material('WoodDesk', (0.58, 0.38, 0.22), 0.6, 0.05)

# Buckets for interior objects to merge into single draw calls
int_buckets = {
    'Interior_Steel': [],
    'Interior_LelyRed': [],
    'Interior_Stainless': [],
    'Interior_Straw': [],
    'Interior_Silage': [],
    'Interior_CalfHutches': [],
    'Interior_Skybox': []
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

# 1. 4x LELY ASTRONAUT MELKROBOTS (Tussenlid Y ~ 56..64, X ~ 17..27)
robot_positions = [
    (18.5, 57.5, 0.0, 0),
    (18.5, 63.5, 0.0, 0),
    (25.5, 57.5, 0.0, 3.14159),
    (25.5, 63.5, 0.0, 3.14159),
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

for gy in [55.0, 60.5, 66.0]:
    make_box(f'Gate_Cross_{gy}', (22.0, gy, 0.6), (7.5, 0.08, 1.1), 'Interior_Steel', mat_steel)
for gx in [17.5, 22.0, 26.5]:
    make_box(f'Gate_Long_{gx}', (gx, 60.5, 0.6), (0.08, 11.0, 1.1), 'Interior_Steel', mat_steel)

# 2. CENTRALE VOERGANG & VOERHEKKEN (Nieuwbouwstal Y: 70..158)
feed_start_y = 71.0
feed_end_y = 158.0
feed_len = feed_end_y - feed_start_y
feed_mid_y = feed_start_y + feed_len / 2.0

make_box('Feed_Alley_Floor', (22.0, feed_mid_y, 0.04), (4.5, feed_len, 0.06), 'Interior_Stainless', mat_stainless)
make_box('Silage_Feed_Left', (20.35, feed_mid_y, 0.22), (0.7, feed_len, 0.35), 'Interior_Silage', mat_silage)
make_box('Silage_Feed_Right', (23.65, feed_mid_y, 0.22), (0.7, feed_len, 0.35), 'Interior_Silage', mat_silage)

for x_rail in [19.8, 24.2]:
    side = 'Left' if x_rail < 22 else 'Right'
    make_box(f'Feed_Fence_Top_{side}', (x_rail, feed_mid_y, 1.15), (0.08, feed_len, 0.08), 'Interior_Steel', mat_steel)
    make_box(f'Feed_Fence_Bottom_{side}', (x_rail, feed_mid_y, 0.28), (0.08, feed_len, 0.08), 'Interior_Steel', mat_steel)
    post_count = int(feed_len / 3.0)
    for p in range(post_count + 1):
        py = feed_start_y + p * 3.0
        make_cyl(f'Feed_Post_{side}_{p}', (x_rail, py, 0.65), 0.045, 1.3, 'Interior_Steel', mat_steel)
        if p < post_count:
            make_cyl(f'Headlock_Bar_{side}_{p}', (x_rail, py + 1.5, 0.70), 0.025, 0.85, 'Interior_Steel', mat_steel, rot=(0, 0.18, 0))

# 3. LIGBOXENRIJEN & MATRASSEN
cubicle_blocks = [
    {'start_x': 14.5, 'end_x': 16.5},
    {'start_x': 6.0,  'end_x': 8.0},
    {'start_x': 27.5, 'end_x': 29.5},
    {'start_x': 36.0, 'end_x': 38.0}
]

for b_idx, block in enumerate(cubicle_blocks):
    bx = (block['start_x'] + block['end_x']) / 2.0
    bw = abs(block['end_x'] - block['start_x'])
    make_box(f'Bedding_Block_{b_idx}', (bx, feed_mid_y, 0.10), (bw, feed_len, 0.18), 'Interior_Straw', mat_cowmat)
    divider_step = 1.3
    div_count = int(feed_len / divider_step)
    for d in range(div_count + 1):
        dy = feed_start_y + d * divider_step
        make_box(f'Cubicle_Divider_{b_idx}_{d}', (bx, dy, 0.65), (bw * 0.95, 0.05, 0.85), 'Interior_Steel', mat_steel)
    make_box(f'Schoftboom_{b_idx}', (bx, feed_mid_y, 1.05), (0.06, feed_len, 0.06), 'Interior_Steel', mat_steel)

# 4. SNELDRANKBAKKEN
water_locs = [
    (18.0, 95.0, 0.45), (26.0, 95.0, 0.45),
    (18.0, 130.0, 0.45), (26.0, 130.0, 0.45),
    (18.0, 40.0, 0.45), (26.0, 40.0, 0.45)
]
for w_idx, (wx, wy, wz) in enumerate(water_locs):
    make_box(f'Water_Trough_{w_idx}', (wx, wy, wz), (0.6, 2.0, 0.45), 'Interior_Stainless', mat_stainless)
    make_box(f'Water_Surface_{w_idx}', (wx, wy, wz + 0.15), (0.54, 1.94, 0.05), 'Interior_Skybox', mat_skybox_glass)

# 5. ROtERENDE KOEBORSTELS
brush_locs = [(18.2, 85.0), (25.8, 85.0), (18.2, 140.0), (25.8, 140.0)]
for br_idx, (brx, bry) in enumerate(brush_locs):
    make_box(f'Brush_Arm_{br_idx}', (brx, bry, 1.8), (0.6, 0.08, 0.08), 'Interior_Steel', mat_steel)
    make_cyl(f'Brush_Roller_{br_idx}', (brx + (0.35 if brx < 22 else -0.35), bry, 1.4), 0.28, 0.7, 'Interior_Straw', mat_straw)

# 6. STROHOKKEN & AFKALFSTAL (B10 Noordzijde Y: 15..50)
make_box('Calving_Straw_Bed', (11.0, 32.0, 0.12), (18.0, 30.0, 0.22), 'Interior_Straw', mat_straw)
for py in [16.0, 26.0, 36.0, 48.0]:
    make_box(f'Calving_Gate_{py}', (11.0, py, 0.65), (18.0, 0.08, 1.2), 'Interior_Steel', mat_steel)
make_box('Calving_Front_Gate', (19.8, 32.0, 0.65), (0.08, 32.0, 1.2), 'Interior_Steel', mat_steel)

# 7. SKYBOX / BEZOEKERSVERDIEPING (B11 Y: 53..68, Z: 4.2)
skybox_y = 60.5
skybox_z = 4.2
make_box('Skybox_Floor', (22.0, skybox_y, skybox_z), (12.0, 14.0, 0.25), 'Interior_Stainless', mat_stainless)
make_box('Skybox_Glass_North', (22.0, skybox_y - 6.9, skybox_z + 0.65), (11.8, 0.06, 1.1), 'Interior_Skybox', mat_skybox_glass)
make_box('Skybox_Glass_South', (22.0, skybox_y + 6.9, skybox_z + 0.65), (11.8, 0.06, 1.1), 'Interior_Skybox', mat_skybox_glass)
make_box('Skybox_Railing_Top_N', (22.0, skybox_y - 6.9, skybox_z + 1.22), (12.0, 0.08, 0.05), 'Interior_Steel', mat_steel)
make_box('Skybox_Railing_Top_S', (22.0, skybox_y + 6.9, skybox_z + 1.22), (12.0, 0.08, 0.05), 'Interior_Steel', mat_steel)

make_box('Herdmanager_Desk', (20.0, 60.0, skybox_z + 0.45), (1.6, 0.8, 0.75), 'Interior_Skybox', mat_wooddesk)
make_box('Monitor_Screen1', (19.8, 60.0, skybox_z + 0.95), (0.5, 0.05, 0.35), 'Interior_Stainless', mat_stainless)
make_box('Monitor_Screen2', (20.4, 60.0, skybox_z + 0.95), (0.5, 0.05, 0.35), 'Interior_Stainless', mat_stainless)

stair_steps = 18
for st in range(stair_steps):
    step_z = (st + 1) * (skybox_z / stair_steps)
    step_y = 53.0 - st * 0.32
    make_box(f'Stair_Step_{st}', (16.2, step_y, step_z - 0.1), (1.4, 0.34, 0.15), 'Interior_Steel', mat_steel)

# 8. KALVERLOODS / JONGVEE (V10 in loods 1: X ~ 68.5, Y ~ 5.0)
calf_base_x = 68.5
calf_base_y = 5.0

make_box('Calf_Group_Straw_1', (calf_base_x - 3.5, calf_base_y + 8.0, 0.10), (7.0, 9.0, 0.18), 'Interior_Straw', mat_straw)
make_box('Calf_Group_Straw_2', (calf_base_x - 3.5, calf_base_y - 5.0, 0.10), (7.0, 9.0, 0.18), 'Interior_Straw', mat_straw)
make_box('Calf_Gate_1', (calf_base_x - 3.5, calf_base_y + 12.5, 0.55), (7.0, 0.06, 1.0), 'Interior_Steel', mat_steel)
make_box('Calf_Gate_2', (calf_base_x - 3.5, calf_base_y + 3.5,  0.55), (7.0, 0.06, 1.0), 'Interior_Steel', mat_steel)
make_box('Calf_Gate_3', (calf_base_x - 3.5, calf_base_y - 9.5,  0.55), (7.0, 0.06, 1.0), 'Interior_Steel', mat_steel)

for c in range(10):
    ch_y = calf_base_y - 14.0 + c * 1.5
    make_box(f'Calf_Hutch_{c}', (calf_base_x + 3.5, ch_y, 0.7), (1.8, 1.15, 1.2), 'Interior_CalfHutches', mat_calfhutch)
    make_box(f'Calf_Hutch_Straw_{c}', (calf_base_x + 3.5, ch_y, 0.12), (1.7, 1.05, 0.15), 'Interior_Straw', mat_straw)
    make_box(f'Calf_Hutch_Gate_{c}', (calf_base_x + 2.55, ch_y, 0.45), (0.05, 1.15, 0.8), 'Interior_Steel', mat_steel)
    make_cyl(f'Milk_Bucket_{c}', (calf_base_x + 2.4, ch_y, 0.35), 0.14, 0.28, 'Interior_CalfHutches', mat_bucket)

mt_x = calf_base_x + 1.0
mt_y = calf_base_y + 2.0
make_cyl('MilkTaxi_Tank', (mt_x, mt_y, 0.75), 0.38, 0.85, 'Interior_Stainless', mat_stainless)
make_box('MilkTaxi_Frame', (mt_x, mt_y, 0.28), (0.9, 0.9, 0.2), 'Interior_Steel', mat_steel)
make_cyl('MilkTaxi_Handle', (mt_x - 0.4, mt_y, 1.05), 0.025, 0.6, 'Interior_Steel', mat_steel, rot=(0, 0.4, 0))
make_cyl('MilkTaxi_Wheel_L', (mt_x + 0.35, mt_y - 0.4, 0.2), 0.2, 0.08, 'Interior_CalfHutches', mat_bucket, rot=(1.5708, 0, 0))
make_cyl('MilkTaxi_Wheel_R', (mt_x + 0.35, mt_y + 0.4, 0.2), 0.2, 0.08, 'Interior_CalfHutches', mat_bucket, rot=(1.5708, 0, 0))
make_cyl('MilkTaxi_Wheel_Front', (mt_x - 0.35, mt_y, 0.15), 0.15, 0.08, 'Interior_CalfHutches', mat_bucket, rot=(1.5708, 0, 0))
make_cyl('MilkTaxi_DoserGun', (mt_x, mt_y + 0.35, 0.95), 0.03, 0.35, 'Interior_LelyRed', mat_lely_red)

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

out_path = '/Users/bert/dev/barnsimulation/roblox/barn_textured.glb'
print(f"Exporting optimized GLB to {out_path}...")

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

print("=== Done! Optimized barn_textured.glb generated! ===")
