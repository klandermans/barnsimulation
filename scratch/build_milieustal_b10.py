import bpy
import mathutils
import os
import math

print("=== BUILDING AUTHENTIC MILIEUSTAL (B10 BLUEPRINT) ===")

bpy.ops.wm.read_factory_settings(use_empty=True)
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
print(f"Loading {fbx_path}...")
bpy.ops.import_scene.fbx(filepath=fbx_path)

def get_obj_center(obj):
    bb = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
    return (
        sum(v.x for v in bb) / 8.0,
        sum(v.y for v in bb) / 8.0,
        sum(v.z for v in bb) / 8.0
    )

keep_fbx = []
to_delete = []

for o in list(bpy.data.objects):
    if o.type != 'MESH':
        to_delete.append(o)
        continue
    n = o.name.lower()
    
    # Exclude other buildings & terrain, and high-frequency moire bars (circular mullions & gutters)
    if ('hoofdgebouw' in n or 'ontwerp' in n or 'logo schaalbaar' in n or
        'loods 1' in n or 'schuur 1' in n or 'schuur 3' in n or 'schuur 4' in n or 
        'milk & dairy' in n or 'woning' in n or 'unit' in n or 'hok 1' in n or
        'straatwerk' in n or 'grond' in n or 'water' in n or 'railing' in n or
        'cpac' in n or "silo's" in n or 'tussen silo' in n or
        'circular mullion' in n or 'gutter' in n):
        to_delete.append(o)
        continue

    cx, cy, cz = get_obj_center(o)
    # Check if object belongs to the long B10 barn envelope (X: -5..48, Y: -2..168)
    if -5.0 <= cx <= 48.0 and -2.0 <= cy <= 168.0:
        keep_fbx.append(o)
    else:
        to_delete.append(o)

print(f"Keeping {len(keep_fbx)} shell objects for Milieustal. Deleting {len(to_delete)} others...")
for o in to_delete:
    bpy.data.objects.remove(o, do_unlink=True)

# Purge unused mesh datablocks
for b in list(bpy.data.meshes):
    if b.users == 0:
        bpy.data.meshes.remove(b)

# --- MATERIALS ---
def make_pbr_mat(name, color, roughness=0.5, metallic=0.1, alpha=1.0, emission=None):
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
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = 2.0
    return mat

mat_roof_light = make_pbr_mat("Roof_Light", (0.55, 0.58, 0.60), 0.6, 0.05) # Clean insulated light-colored roof
mat_skylight   = make_pbr_mat("Skylight", (0.88, 0.95, 1.00), 0.1, 0.1, alpha=0.6) # Polycarbonate ridge skylight
mat_wall_panel = make_pbr_mat("Wall_Panel", (0.28, 0.42, 0.30), 0.5, 0.1) # Ag-green sandwich panel
mat_concrete   = make_pbr_mat("Slats_Concrete", (0.78, 0.79, 0.81), 0.7, 0.02) # Concrete slatted floor
mat_feed_curb  = make_pbr_mat("Feed_Curb", (0.85, 0.86, 0.88), 0.4, 0.02) # Smooth coated feed alley
mat_straw      = make_pbr_mat("Deep_Straw", (0.86, 0.74, 0.44), 0.9, 0.0) # Golden straw bedding
mat_silage     = make_pbr_mat("Fresh_Silage", (0.42, 0.46, 0.22), 0.95, 0.0) # Fresh green forage
mat_steel      = make_pbr_mat("Galv_Steel", (0.80, 0.82, 0.85), 0.35, 0.85) # Galvanized steel partitions
mat_stainless  = make_pbr_mat("Stainless", (0.92, 0.93, 0.95), 0.20, 0.90) # Polished stainless steel (robots, tanks)
mat_lely_red   = make_pbr_mat("Lely_Red", (0.82, 0.08, 0.08), 0.30, 0.20) # Official Lely Astronaut red
mat_lely_sph   = make_pbr_mat("Lely_Sphere", (0.12, 0.12, 0.14), 0.40, 0.10) # Black rubber dung separation spheres
mat_silo_white = make_pbr_mat("Silo_White", (0.94, 0.95, 0.96), 0.25, 0.60)
mat_glass      = make_pbr_mat("Skybox_Glass", (0.75, 0.90, 1.00), 0.10, 0.20, alpha=0.50)
mat_desk_wood  = make_pbr_mat("Desk_Wood", (0.62, 0.42, 0.26), 0.60, 0.0)
mat_water_pool = make_pbr_mat("Water_Pool", (0.20, 0.55, 0.85), 0.10, 0.40, alpha=0.85)
mat_led_strip  = make_pbr_mat("LED_Highbay", (1.0, 0.98, 0.92), 0.1, 0.0, emission=(1.0, 0.98, 0.92))

# Assign bright materials to FBX outer shell
for o in keep_fbx:
    n = o.name.lower()
    o.data.materials.clear()
    if 'dak' in n or 'roof' in n:
        o.data.materials.append(mat_roof_light)
    elif 'glas' in n or 'licht' in n or 'curtain' in n or 'system panel' in n:
        o.data.materials.append(mat_skylight)
    elif 'sandwich' in n or 'gevel' in n or 'hout' in n:
        o.data.materials.append(mat_wall_panel)
    elif 'trap' in n or 'stair' in n or 'stringer' in n:
        o.data.materials.append(mat_steel)
    else:
        o.data.materials.append(mat_concrete)

# --- PROCEDURAL INTERIOR GENERATORS ---
interior_items = []

def make_box(name, pos, size, mat):
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    
    hw = size[0] / 2.0
    hd = size[1] / 2.0
    hh = size[2] / 2.0
    
    verts = [
        (-hw, -hd, -hh), (hw, -hd, -hh), (hw, hd, -hh), (-hw, hd, -hh),
        (-hw, -hd,  hh), (hw, -hd,  hh), (hw, hd,  hh), (-hw, hd,  hh)
    ]
    faces = [
        (0, 1, 2, 3), (4, 5, 6, 7),
        (0, 1, 5, 4), (2, 3, 7, 6),
        (0, 3, 7, 4), (1, 2, 6, 5)
    ]
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj.location = pos
    obj.data.materials.append(mat)
    interior_items.append(obj)
    return obj

def make_cyl(name, pos, radius, height, mat, segments=12, rot=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name + "_mesh")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    
    verts = []
    hh = height / 2.0
    for i in range(segments):
        theta = 2.0 * math.pi * i / segments
        x = radius * math.cos(theta)
        y = radius * math.sin(theta)
        verts.append((x, y, -hh))
        verts.append((x, y,  hh))
        
    faces = []
    for i in range(segments):
        i2 = (i + 1) % segments
        faces.append((i*2, i2*2, i2*2 + 1, i*2 + 1))
        
    bottom_cap = [i*2 for i in reversed(range(segments))]
    top_cap = [i*2 + 1 for i in range(segments)]
    faces.append(bottom_cap)
    faces.append(top_cap)
    
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj.location = pos
    obj.rotation_euler = rot
    obj.data.materials.append(mat)
    interior_items.append(obj)
    return obj

# -------------------------------------------------------------
# 1. LED LIGHTING FIXTURES (Running length of barn for bright interior)
# -------------------------------------------------------------
for y in range(10, 160, 14):
    for x in [8.0, 22.0, 36.0]:
        make_box(f"LED_Highbay_{x}_{y}", (x, y, 6.2), (1.2, 0.4, 0.12), mat_led_strip)
        make_cyl(f"Hanger_{x}_{y}", (x, y, 7.1), 0.02, 1.8, mat_steel)

# -------------------------------------------------------------
# 2. CENTRAL TUSSENLID (Y = 52..65) - 4x LELY ASTRONAUT MELKROBOTS & SKYBOX
# -------------------------------------------------------------
make_box("Tussenlid_Floor", (22.0, 58.5, 0.05), (38.0, 13.0, 0.10), mat_concrete)

# 4 Lely Astronaut A5 Robots: Robots 2 & 3 (North facing), Robots 4 & 5 (South facing)
robot_specs = [
    ("Melkrobot_2", 15.0, 56.5, 0.0),
    ("Melkrobot_3", 29.0, 56.5, 0.0),
    ("Melkrobot_4", 15.0, 60.5, 3.1416),
    ("Melkrobot_5", 29.0, 60.5, 3.1416),
]

for r_name, rx, ry, ryaw in robot_specs:
    make_box(f"{r_name}_Base", (rx, ry, 0.08), (1.8, 2.8, 0.16), mat_concrete)
    make_box(f"{r_name}_Cabinet", (rx - 0.7, ry, 1.2), (0.4, 1.2, 2.1), mat_lely_red)
    make_box(f"{r_name}_StallFrame", (rx, ry, 1.1), (1.4, 2.6, 2.0), mat_stainless)
    make_box(f"{r_name}_FeedBowl", (rx + 0.5, ry - 0.9, 0.65), (0.5, 0.5, 0.5), mat_stainless)
    make_box(f"{r_name}_Arm", (rx, ry + 0.2, 0.35), (0.6, 0.8, 0.35), mat_lely_red)
    make_cyl(f"{r_name}_TeatCup_1", (rx - 0.1, ry + 0.1, 0.55), 0.03, 0.18, mat_stainless)
    make_cyl(f"{r_name}_TeatCup_2", (rx + 0.1, ry + 0.1, 0.55), 0.03, 0.18, mat_stainless)
    make_cyl(f"{r_name}_TeatCup_3", (rx - 0.1, ry + 0.3, 0.55), 0.03, 0.18, mat_stainless)
    make_cyl(f"{r_name}_TeatCup_4", (rx + 0.1, ry + 0.3, 0.55), 0.03, 0.18, mat_stainless)

# Herd Management PC desk in center (Y = 58.5, X = 22.0)
make_box("PC_Desk_Central", (22.0, 58.5, 0.42), (2.2, 1.1, 0.75), mat_desk_wood)
make_box("PC_Monitor_A", (21.5, 58.5, 0.92), (0.55, 0.06, 0.38), mat_stainless)
make_box("PC_Monitor_B", (22.5, 58.5, 0.92), (0.55, 0.06, 0.38), mat_stainless)
make_box("Behandelbox_Crush", (22.0, 55.0, 1.0), (1.2, 2.5, 1.9), mat_steel)

# 3 Outdoor Feed Silos at east wall (X = 45.5, Y = 58.5)
for s_i, sy in enumerate([54.5, 58.5, 62.5]):
    s_rad = 1.6 if s_i == 1 else 1.25
    s_h = 7.0 if s_i == 1 else 5.2
    make_cyl(f"Outdoor_Silo_{s_i+1}", (45.5, sy, s_h/2.0 + 1.2), s_rad, s_h, mat_silo_white)
    make_cyl(f"Silo_Cone_{s_i+1}", (45.5, sy, 0.7), s_rad * 0.6, 1.2, mat_silo_white)

# Skybox / Mezzanine viewing platform (Z = 4.2m)
sky_z = 4.2
make_box("Skybox_Floor", (22.0, 58.5, sky_z), (26.0, 6.5, 0.22), mat_feed_curb)
make_box("Skybox_Glass_N", (22.0, 61.7, sky_z + 0.65), (25.8, 0.08, 1.15), mat_glass)
make_box("Skybox_Glass_S", (22.0, 55.3, sky_z + 0.65), (25.8, 0.08, 1.15), mat_glass)
make_box("Skybox_Rail_N", (22.0, 61.7, sky_z + 1.24), (26.0, 0.08, 0.06), mat_steel)
make_box("Skybox_Rail_S", (22.0, 55.3, sky_z + 1.24), (26.0, 0.08, 0.06), mat_steel)
make_box("Skybox_MeetingTable", (22.0, 58.5, sky_z + 0.42), (2.8, 1.3, 0.75), mat_desk_wood)

# -------------------------------------------------------------
# 3. NIEUWE STAL (Y = 65..140) - 272 CUBICLES, DUAL VOERSTOEPEN, LELY SPHERE
# -------------------------------------------------------------
nb_y0 = 65.0
nb_y1 = 140.0
nb_len = nb_y1 - nb_y0
nb_mid_y = (nb_y0 + nb_y1) / 2.0

# Dual Elevated Feed Alleys (+80 cm) according to B10 "Voerstoep 80+P"
make_box("Voerstoep_North_Alley", (2.2, nb_mid_y, 0.35), (4.4, nb_len, 0.70), mat_feed_curb)
make_box("Voerstoep_North_Silage", (3.2, nb_mid_y, 0.75), (1.4, nb_len, 0.18), mat_silage)
make_box("Voerstoep_South_Alley", (41.8, nb_mid_y, 0.35), (4.4, nb_len, 0.70), mat_feed_curb)
make_box("Voerstoep_South_Silage", (40.8, nb_mid_y, 0.75), (1.4, nb_len, 0.18), mat_silage)

# Self-locking feed fences along both feed alleys
for fx, side in [(4.4, "N"), (39.6, "S")]:
    make_box(f"Feed_Fence_Beam_Top_{side}", (fx, nb_mid_y, 1.25), (0.08, nb_len, 0.08), mat_steel)
    make_box(f"Feed_Fence_Beam_Bot_{side}", (fx, nb_mid_y, 0.45), (0.08, nb_len, 0.08), mat_steel)
    posts = int(nb_len / 2.5)
    for p in range(posts + 1):
        py = nb_y0 + p * 2.5
        make_cyl(f"Feed_Post_{side}_{p}", (fx, py, 0.75), 0.045, 1.4, mat_steel)

# Concrete Slatted Floor with Lely Sphere valves
make_box("Slatted_Floor_Main", (22.0, nb_mid_y, 0.04), (35.0, nb_len, 0.08), mat_concrete)
for sx in [7.2, 13.5, 22.0, 30.5, 36.8]:
    for sy in range(int(nb_y0 + 3), int(nb_y1 - 3), 5):
        make_cyl(f"LelySphere_{sx}_{sy}", (sx, float(sy), 0.05), 0.16, 0.08, mat_lely_sph)

# 4 Double Rows of Comfort Cubicles (1200 x 3000 mm diepstrooisel)
cubicle_rows = [
    (9.5, 12.0, "Row1"),
    (16.0, 18.5, "Row2"),
    (25.5, 28.0, "Row3"),
    (32.0, 34.5, "Row4"),
]

for x_a, x_b, r_tag in cubicle_rows:
    for rx in [x_a, x_b]:
        make_box(f"Straw_{r_tag}_{rx}", (rx, nb_mid_y, 0.14), (2.4, nb_len, 0.20), mat_straw)
        make_box(f"NeckRail_{r_tag}_{rx}", (rx, nb_mid_y, 1.15), (0.06, nb_len, 0.06), mat_steel)
        step = 1.25
        num_divs = int(nb_len / step)
        for d in range(num_divs + 1):
            dy = nb_y0 + d * step
            make_box(f"Cubicle_Div_{r_tag}_{rx}_{d}", (rx, dy, 0.70), (2.2, 0.05, 0.85), mat_steel)

# 4 Crossovers with Suevia RVS Drink Troughs & Cow Brushes
for idx, cy in enumerate([78.0, 98.0, 118.0, 136.0]):
    for wx in [14.0, 30.0]:
        make_box(f"Suevia_Trough_{wx}_{idx}", (wx, cy, 0.45), (0.6, 2.4, 0.45), mat_stainless)
        make_box(f"Water_Surface_{wx}_{idx}", (wx, cy, 0.62), (0.54, 2.34, 0.06), mat_water_pool)
        make_box(f"Brush_Arm_{wx}_{idx}", (wx, cy + 2.8, 1.9), (0.6, 0.08, 0.08), mat_steel)
        make_cyl(f"Brush_Roll_{wx}_{idx}", (wx + 0.3, cy + 2.8, 1.45), 0.26, 0.75, mat_straw)

# Trioliet Autonomous Feeding Robot on suspended rail
make_box("Trioliet_Rail", (40.2, nb_mid_y, 5.0), (0.12, nb_len, 0.18), mat_steel)
make_box("Trioliet_Feeder", (40.2, 105.0, 4.3), (1.5, 2.8, 1.2), mat_stainless)

# -------------------------------------------------------------
# 4. SOUTH KOPGEVEL (Y = 140..165) - VOERBUNKERS, EMISSIELAB, JUNO & EXOS
# -------------------------------------------------------------
kop_y0 = 140.0
kop_y1 = 164.0
kop_mid = (kop_y0 + kop_y1) / 2.0

make_box("Kopgevel_Floor", (22.0, kop_mid, 0.05), (42.0, kop_y1 - kop_y0, 0.10), mat_concrete)

# 7 Concrete Voerbunkers (open silage storage bays along north-south wall)
for b_i in range(7):
    bx = 4.0 + b_i * 3.8
    make_box(f"Voerbunker_Wall_L_{b_i}", (bx - 1.8, 153.0, 1.2), (0.22, 18.0, 2.4), mat_concrete)
    make_box(f"Voerbunker_Wall_R_{b_i}", (bx + 1.8, 153.0, 1.2), (0.22, 18.0, 2.4), mat_concrete)
    make_box(f"Voerbunker_Silage_{b_i}", (bx, 153.0, 0.8), (3.2, 16.0, 1.4), mat_silage)

# Stallucht behandel- & Onderzoekersruimte (Emissielab)
make_box("Emissie_Lab_Room", (36.0, 153.0, 1.5), (9.0, 16.0, 3.0), mat_wall_panel)
make_box("Emissie_Lab_Door", (31.4, 148.0, 1.1), (0.1, 1.0, 2.2), mat_steel)
# Air Scrubbers and Gas Sampling Ducts
for s_i, sy in enumerate([147.0, 152.0, 157.0]):
    make_cyl(f"Air_Scrubber_Col_{s_i}", (34.0, sy, 2.4), 0.9, 4.4, mat_stainless)
    make_cyl(f"Air_Duct_{s_i}", (34.0, sy, 4.7), 0.3, 1.2, mat_steel)
make_cyl("Scrubber_Collector_Pipe", (34.0, 152.0, 5.1), 0.35, 12.0, mat_steel, rot=(0, 1.5708, 0))

# Lely Juno Automatic Feed Pusher & Lely Exos robot
make_cyl("Lely_Juno_Pusher", (4.8, 142.0, 0.35), 0.65, 0.70, mat_lely_red)
make_box("Lely_Exos_Harvester", (40.0, 143.0, 0.65), (1.6, 3.0, 1.2), mat_lely_red)

# -------------------------------------------------------------
# 5. BESTAANDE STAL (Y = 6..52) - AFKALFSTALLEN, MELKTANKS, MELKROBOT 1
# -------------------------------------------------------------
ex_mid_y = 29.0
ex_len = 46.0

# Afkalfstallen / Maternity Pens with deep straw bed
make_box("Maternity_Straw_Bed", (4.0, ex_mid_y, 0.16), (6.0, ex_len, 0.28), mat_straw)
for my in range(8, 50, 8):
    make_box(f"Maternity_Gate_{my}", (4.0, float(my), 0.65), (6.0, 0.08, 1.2), mat_steel)

# Melkrobot 1 (for fresh/attentive cows)
make_box("Melkrobot_1_Cabinet", (11.0, 48.0, 1.2), (0.4, 1.2, 2.1), mat_lely_red)
make_box("Melkrobot_1_Stall", (12.0, 48.0, 1.1), (1.4, 2.6, 2.0), mat_stainless)

# Melktanklokaal (Milk Storage Room with 2 large Mueller RVS cooling tanks)
make_box("Melktank_Room", (36.0, 15.0, 1.5), (9.0, 14.0, 3.0), mat_wall_panel)
make_cyl("Mueller_Tank_1", (34.0, 12.0, 1.8), 1.3, 3.4, mat_stainless)
make_cyl("Mueller_Tank_2", (38.0, 12.0, 1.8), 1.3, 3.4, mat_stainless)

# Kantine & Hygiënesluis (Bezoekersentree)
make_box("Kantine_Kantoor", (36.0, 32.0, 1.5), (9.0, 18.0, 3.0), mat_wall_panel)
make_box("Kantine_Desk", (36.0, 32.0, 0.42), (3.0, 1.2, 0.75), mat_desk_wood)

print(f"Generated {len(interior_items)} authentic interior components according to B10 blueprint!")

# -------------------------------------------------------------
# 6. EXPORT milieustallen.glb
# -------------------------------------------------------------
out_file = '/Users/bert/dev/barnsimulation/roblox/models/milieustallen.glb'
bpy.ops.object.select_all(action='DESELECT')
for o in keep_fbx:
    o.select_set(True)
for o in interior_items:
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
print(f"=== SUCCESS! Exported milieustallen.glb ({size_mb:.2f} MB) with {len(keep_fbx)} shell + {len(interior_items)} interior items ===")
