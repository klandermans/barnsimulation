import bpy
import os

print("=== Starting Blender Dairy Campus PBR Textured Processing ===")

# 1. Reset scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# 2. Import Revit FBX
fbx_path = '/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx'
print(f"Importing {fbx_path}...")
bpy.ops.import_scene.fbx(filepath=fbx_path)

mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"Successfully imported {len(mesh_objs)} meshes!")

# 3. Categorization
CATEGORIES = {
    'Roofs': ['dakplaten', 'Roof', 'dak', 'ontwerpdak', 'isolatie PIR', 'boeiboord', 'goot'],
    'Walls_Wood': ['houten geveldelen', 'geveldelen'],
    'Walls_Sandwich': ['sandwichpaneel', 'ontwerpwand'],
    'Walls_Brick': ['mw 100', 'metselwerk'],
    'Walls_Concrete': ['beton prefab', 'prefab 110'],
    'Floors_Ground': ['grond', 'gras', 'weide'],
    'Floors_Paving': ['straatwerk', 'asfalt', 'klinkers'],
    'Floors_Concrete': ['beton ihwg', 'vloer', 'Floor'],
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

# 4. Load textures and create PBR materials
tex_dir = '/Users/bert/dev/barnsimulation/scratch/textures'

TEXTURE_MAP = {
    'Roofs': f'{tex_dir}/roof_metal_diffuse.png',
    'Walls_Wood': f'{tex_dir}/barn_wood_diffuse.png',
    'Walls_Sandwich': f'{tex_dir}/sandwich_panel_diffuse.png',
    'Walls_Brick': f'{tex_dir}/brick_diffuse.png',
    'Floors_Paving': f'{tex_dir}/paving_diffuse.png',
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

            # Add mapping node for tiling
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
    'Floors_Ground': ((0.28, 0.62, 0.22), 0.9, 0.0, 1.0, 1.0),
    'Floors_Paving': ((0.32, 0.33, 0.35), 0.8, 0.05, 15.0, 1.0),
    'Floors_Concrete': ((0.62, 0.64, 0.65), 0.7, 0.05, 1.0, 1.0),
    'Doors_Industrial': ((0.10, 0.35, 0.72), 0.35, 0.2, 1.0, 1.0),
    'Railings': ((0.75, 0.76, 0.78), 0.3, 0.75, 1.0, 1.0),
    'Silos': ((0.85, 0.87, 0.90), 0.25, 0.85, 8.0, 1.0),
    'Glass': ((0.65, 0.82, 0.95), 0.1, 0.1, 1.0, 0.35),
    'Mullions': ((0.20, 0.22, 0.25), 0.4, 0.6, 1.0, 1.0),
    'Stairs_Structure': ((0.42, 0.45, 0.48), 0.4, 0.7, 1.0, 1.0),
    'Other_Buildings': ((0.78, 0.78, 0.78), 0.6, 0.05, 1.0, 1.0)
}

joined_objects = []

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
    
    # Smart UV Project
    try:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.01)
        bpy.ops.object.mode_set(mode='OBJECT')
    except Exception as e:
        try:
            bpy.ops.object.mode_set(mode='OBJECT')
        except:
            pass

    joined_objects.append(joined_obj)
    print(f"-> Joined & Textured {joined_obj.name}")

out_path = '/Users/bert/dev/barnsimulation/roblox/barn_textured.glb'
print(f"Exporting to {out_path}...")

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

print("=== Done! barn_textured.glb generated with embedded PBR textures! ===")
