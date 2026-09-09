import bpy
import bmesh
import math
import os

print('=== Generating Dairy Campus Stalinrichting ===')

int_col = bpy.data.collections.new('Stalinrichting')
bpy.context.scene.collection.children.link(int_col)

tex_dir = '/Users/bert/dev/barnsimulation/scratch/textures'

def make_mat(name, color, rough=0.5, metal=0.0, alpha=1.0, tex_name=None, uv_scale=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    if bsdf:
        if 'Roughness' in bsdf.inputs: bsdf.inputs['Roughness'].default_value = rough
        if 'Metallic' in bsdf.inputs: bsdf.inputs['Metallic'].default_value = metal
        if 'Alpha' in bsdf.inputs: bsdf.inputs['Alpha'].default_value = alpha
        if alpha < 1.0:
            mat.blend_method = 'BLEND'
        if tex_name and os.path.exists(f'{tex_dir}/{tex_name}'):
            img = bpy.data.images.load(f'{tex_dir}/{tex_name}')
            tex_node = nodes.new('ShaderNodeTexImage')
            tex_node.image = img
            links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
            coord_node = nodes.new('ShaderNodeTexCoord')
            map_node = nodes.new('ShaderNodeMapping')
            map_node.inputs['Scale'].default_value = (uv_scale, uv_scale, uv_scale)
            links.new(coord_node.outputs['UV'], map_node.inputs['Vector'])
            links.new(map_node.outputs['Vector'], tex_node.inputs['Vector'])
        else:
            if 'Base Color' in bsdf.inputs:
                bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    return mat

mat_steel = make_mat('Mat_GalvSteel', (0.78, 0.80, 0.82), rough=0.35, metal=0.85)
mat_lely_red = make_mat('Mat_LelyRed', (0.78, 0.06, 0.12), rough=0.35, metal=0.1)
mat_stainless = make_mat('Mat_Stainless', (0.88, 0.90, 0.92), rough=0.2, metal=0.92)
mat_straw = make_mat('Mat_Straw', (0.85, 0.72, 0.32), rough=0.9, metal=0.0, tex_name='straw_diffuse.png', uv_scale=6.0)
mat_silage = make_mat('Mat_Silage', (0.35, 0.45, 0.18), rough=0.95, metal=0.0, tex_name='silage_diffuse.png', uv_scale=8.0)
mat_cowmat = make_mat('Mat_CowMat', (0.22, 0.32, 0.22), rough=0.8, metal=0.05)
mat_calfhutch = make_mat('Mat_CalfHutch', (0.95, 0.96, 0.96), rough=0.3, metal=0.05)
mat_bucket = make_mat('Mat_BucketRed', (0.85, 0.15, 0.10), rough=0.4, metal=0.05)
mat_glass = make_mat('Mat_SkyboxGlass', (0.68, 0.84, 0.95), rough=0.1, metal=0.1, alpha=0.4)
mat_wooddesk = make_mat('Mat_WoodDesk', (0.58, 0.38, 0.22), rough=0.6, metal=0.05)

created_meshes = []

def add_box(name, pos, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pos)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(mat)
    created_meshes.append(obj)
    return obj

def add_cylinder(name, pos, radius, depth, mat, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=depth, location=pos, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.transform_apply(rotation=True, scale=True)
    obj.data.materials.append(mat)
    created_meshes.append(obj)
    return obj

# 1. 4x LELY ASTRONAUT MELKROBOTS (Tussenlid Y ~ 56..64, X ~ 17..27)
robot_positions = [
    (18.5, 57.5, 0.0, 0),
    (18.5, 63.5, 0.0, 0),
    (25.5, 57.5, 0.0, math.pi),
    (25.5, 63.5, 0.0, math.pi),
]

for idx, (rx, ry, rz, rrot) in enumerate(robot_positions):
    prefix = f'Lely_Robot_{idx+1}'
    add_box(f'{prefix}_Frame', (rx, ry, rz + 0.95), (1.1, 2.3, 1.9), mat_stainless)
    add_box(f'{prefix}_RedCover', (rx, ry, rz + 1.95), (1.12, 2.32, 0.15), mat_lely_red)
    add_box(f'{prefix}_RedSide', (rx + (0.55 if rrot==0 else -0.55), ry, rz + 1.1), (0.05, 2.32, 1.6), mat_lely_red)
    feed_pos_y = ry + (0.9 if rrot==0 else -0.9)
    add_box(f'{prefix}_Trough', (rx, feed_pos_y, rz + 0.6), (0.7, 0.45, 0.65), mat_stainless)
    arm_pos_y = ry - (0.3 if rrot==0 else -0.3)
    add_box(f'{prefix}_ArmBase', (rx + (0.3 if rrot==0 else -0.3), arm_pos_y, rz + 0.35), (0.45, 0.25, 0.25), mat_stainless)
    add_cylinder(f'{prefix}_LaserCluster', (rx, arm_pos_y, rz + 0.45), 0.12, 0.25, mat_lely_red)
    add_cylinder(f'{prefix}_MilkJar', (rx + (0.45 if rrot==0 else -0.45), ry - 0.7, rz + 1.2), 0.14, 0.45, mat_glass)
    add_cylinder(f'{prefix}_Pipe', (rx + (0.45 if rrot==0 else -0.45), ry - 0.7, rz + 1.65), 0.03, 0.5, mat_stainless)

for gy in [55.0, 60.5, 66.0]:
    add_box(f'Gate_Cross_{gy}', (22.0, gy, 0.6), (7.5, 0.08, 1.1), mat_steel)
for gx in [17.5, 22.0, 26.5]:
    add_box(f'Gate_Long_{gx}', (gx, 60.5, 0.6), (0.08, 11.0, 1.1), mat_steel)

# 2. CENTRALE VOERGANG & VOERHEKKEN (Nieuwbouwstal Y: 70..158)
feed_start_y = 71.0
feed_end_y = 158.0
feed_len = feed_end_y - feed_start_y
feed_mid_y = feed_start_y + feed_len / 2.0

add_box('Feed_Alley_Floor', (22.0, feed_mid_y, 0.04), (4.5, feed_len, 0.06), mat_stainless)
add_box('Silage_Feed_Left', (20.35, feed_mid_y, 0.22), (0.7, feed_len, 0.35), mat_silage)
add_box('Silage_Feed_Right', (23.65, feed_mid_y, 0.22), (0.7, feed_len, 0.35), mat_silage)

for x_rail in [19.8, 24.2]:
    side = 'Left' if x_rail < 22 else 'Right'
    add_box(f'Feed_Fence_Top_{side}', (x_rail, feed_mid_y, 1.15), (0.08, feed_len, 0.08), mat_steel)
    add_box(f'Feed_Fence_Bottom_{side}', (x_rail, feed_mid_y, 0.28), (0.08, feed_len, 0.08), mat_steel)
    post_count = int(feed_len / 3.0)
    for p in range(post_count + 1):
        py = feed_start_y + p * 3.0
        add_cylinder(f'Feed_Post_{side}_{p}', (x_rail, py, 0.65), 0.045, 1.3, mat_steel)
        if p < post_count:
            add_cylinder(f'Headlock_Bar_{side}_{p}', (x_rail, py + 1.5, 0.70), 0.025, 0.85, mat_steel, rot=(0, 0.18, 0))

# 3. LIGBOXENRIJEN & MATRASSEN (Cubicles / Stalls)
cubicle_blocks = [
    {'start_x': 14.5, 'end_x': 16.5, 'rows': 2},
    {'start_x': 6.0,  'end_x': 8.0,  'rows': 2},
    {'start_x': 27.5, 'end_x': 29.5, 'rows': 2},
    {'start_x': 36.0, 'end_x': 38.0, 'rows': 2}
]

for b_idx, block in enumerate(cubicle_blocks):
    bx = (block['start_x'] + block['end_x']) / 2.0
    bw = abs(block['end_x'] - block['start_x'])
    add_box(f'Bedding_Block_{b_idx}', (bx, feed_mid_y, 0.10), (bw, feed_len, 0.18), mat_cowmat)
    divider_step = 1.3
    div_count = int(feed_len / divider_step)
    for d in range(div_count + 1):
        dy = feed_start_y + d * divider_step
        add_box(f'Cubicle_Divider_{b_idx}_{d}', (bx, dy, 0.65), (bw * 0.95, 0.05, 0.85), mat_steel)
    add_box(f'Schoftboom_{b_idx}', (bx, feed_mid_y, 1.05), (0.06, feed_len, 0.06), mat_steel)

# 4. SNELDRANKBAKKEN
water_locs = [
    (18.0, 95.0, 0.45), (26.0, 95.0, 0.45),
    (18.0, 130.0, 0.45), (26.0, 130.0, 0.45),
    (18.0, 40.0, 0.45), (26.0, 40.0, 0.45)
]
for w_idx, (wx, wy, wz) in enumerate(water_locs):
    add_box(f'Water_Trough_{w_idx}', (wx, wy, wz), (0.6, 2.0, 0.45), mat_stainless)
    add_box(f'Water_Surface_{w_idx}', (wx, wy, wz + 0.15), (0.54, 1.94, 0.05), mat_glass)

# 5. ROtERENDE KOEBORSTELS (Lely Luna Brushes)
brush_locs = [(18.2, 85.0), (25.8, 85.0), (18.2, 140.0), (25.8, 140.0)]
for br_idx, (brx, bry) in enumerate(brush_locs):
    add_box(f'Brush_Arm_{br_idx}', (brx, bry, 1.8), (0.6, 0.08, 0.08), mat_steel)
    add_cylinder(f'Brush_Roller_{br_idx}', (brx + (0.35 if brx < 22 else -0.35), bry, 1.4), 0.28, 0.7, mat_straw)

# 6. STROHOKKEN & AFKALFSTAL (B10 Noordzijde Y: 15..50)
add_box('Calving_Straw_Bed', (11.0, 32.0, 0.12), (18.0, 30.0, 0.22), mat_straw)
for py in [16.0, 26.0, 36.0, 48.0]:
    add_box(f'Calving_Gate_{py}', (11.0, py, 0.65), (18.0, 0.08, 1.2), mat_steel)
add_box('Calving_Front_Gate', (19.8, 32.0, 0.65), (0.08, 32.0, 1.2), mat_steel)

# 7. SKYBOX / BEZOEKERSVERDIEPING (B11 Y: 53..68, Z: 4.2)
skybox_y = 60.5
skybox_z = 4.2
add_box('Skybox_Floor', (22.0, skybox_y, skybox_z), (12.0, 14.0, 0.25), mat_stainless)
add_box('Skybox_Glass_North', (22.0, skybox_y - 6.9, skybox_z + 0.65), (11.8, 0.06, 1.1), mat_glass)
add_box('Skybox_Glass_South', (22.0, skybox_y + 6.9, skybox_z + 0.65), (11.8, 0.06, 1.1), mat_glass)
add_box('Skybox_Railing_Top_N', (22.0, skybox_y - 6.9, skybox_z + 1.22), (12.0, 0.08, 0.05), mat_steel)
add_box('Skybox_Railing_Top_S', (22.0, skybox_y + 6.9, skybox_z + 1.22), (12.0, 0.08, 0.05), mat_steel)

add_box('Herdmanager_Desk', (20.0, 60.0, skybox_z + 0.45), (1.6, 0.8, 0.75), mat_wooddesk)
add_box('Monitor_Screen1', (19.8, 60.0, skybox_z + 0.95), (0.5, 0.05, 0.35), mat_stainless)
add_box('Monitor_Screen2', (20.4, 60.0, skybox_z + 0.95), (0.5, 0.05, 0.35), mat_stainless)

stair_steps = 18
for st in range(stair_steps):
    step_z = (st + 1) * (skybox_z / stair_steps)
    step_y = 53.0 - st * 0.32
    add_box(f'Stair_Step_{st}', (16.2, step_y, step_z - 0.1), (1.4, 0.34, 0.15), mat_steel)

# 8. KALVERLOODS / JONGVEE (V10 in loods 1: X ~ 68.5, Y ~ 5.0)
calf_base_x = 68.5
calf_base_y = 5.0

add_box('Calf_Group_Straw_1', (calf_base_x - 3.5, calf_base_y + 8.0, 0.10), (7.0, 9.0, 0.18), mat_straw)
add_box('Calf_Group_Straw_2', (calf_base_x - 3.5, calf_base_y - 5.0, 0.10), (7.0, 9.0, 0.18), mat_straw)
add_box('Calf_Gate_1', (calf_base_x - 3.5, calf_base_y + 12.5, 0.55), (7.0, 0.06, 1.0), mat_steel)
add_box('Calf_Gate_2', (calf_base_x - 3.5, calf_base_y + 3.5,  0.55), (7.0, 0.06, 1.0), mat_steel)
add_box('Calf_Gate_3', (calf_base_x - 3.5, calf_base_y - 9.5,  0.55), (7.0, 0.06, 1.0), mat_steel)

for c in range(10):
    ch_y = calf_base_y - 14.0 + c * 1.5
    add_box(f'Calf_Hutch_{c}', (calf_base_x + 3.5, ch_y, 0.7), (1.8, 1.15, 1.2), mat_calfhutch)
    add_box(f'Calf_Hutch_Straw_{c}', (calf_base_x + 3.5, ch_y, 0.12), (1.7, 1.05, 0.15), mat_straw)
    add_box(f'Calf_Hutch_Gate_{c}', (calf_base_x + 2.55, ch_y, 0.45), (0.05, 1.15, 0.8), mat_steel)
    add_cylinder(f'Milk_Bucket_{c}', (calf_base_x + 2.4, ch_y, 0.35), 0.14, 0.28, mat_bucket)

mt_x = calf_base_x + 1.0
mt_y = calf_base_y + 2.0
add_cylinder('MilkTaxi_Tank', (mt_x, mt_y, 0.75), 0.38, 0.85, mat_stainless)
add_box('MilkTaxi_Frame', (mt_x, mt_y, 0.28), (0.9, 0.9, 0.2), mat_steel)
add_cylinder('MilkTaxi_Handle', (mt_x - 0.4, mt_y, 1.05), 0.025, 0.6, mat_steel, rot=(0, 0.4, 0))
add_cylinder('MilkTaxi_Wheel_L', (mt_x + 0.35, mt_y - 0.4, 0.2), 0.2, 0.08, mat_bucket, rot=(math.pi/2, 0, 0))
add_cylinder('MilkTaxi_Wheel_R', (mt_x + 0.35, mt_y + 0.4, 0.2), 0.2, 0.08, mat_bucket, rot=(math.pi/2, 0, 0))
add_cylinder('MilkTaxi_Wheel_Front', (mt_x - 0.35, mt_y, 0.15), 0.15, 0.08, mat_bucket, rot=(math.pi/2, 0, 0))
add_cylinder('MilkTaxi_DoserGun', (mt_x, mt_y + 0.35, 0.95), 0.03, 0.35, mat_lely_red)

print(f'=== Successfully created {len(created_meshes)} stalinrichting objects ===')
