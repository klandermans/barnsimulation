import bpy
import mathutils
import math

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/Users/bert/dev/barnsimulation/roblox/01bSITUATIEINRICHTING-3DView-{3D}.fbx')

# Select only Hoofdgebouw related objects
hg_names = []
for o in list(bpy.data.objects):
    if o.type == 'MESH':
        if ('hoofdgebouw' in o.name.lower() or 
            'ontwerp' in o.name.lower() or 
            'logo schaalbaar' in o.name.lower()):
            hg_names.append(o.name)
        else:
            bpy.data.objects.remove(o, do_unlink=True)

print(f"Keeping {len(hg_names)} Hoofdgebouw objects")

cam_data = bpy.data.cameras.new('Cam')
cam_obj = bpy.data.objects.new('Cam', cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj

cam_obj.location = (45.0, -55.0, 30.0)
target = mathutils.Vector((5.0, -25.0, 5.0))
direction = target - cam_obj.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam_obj.rotation_euler = rot_quat.to_euler()

scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.display.shading.light = 'MATCAP'
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = '/Users/bert/.gemini/antigravity-cli/brain/ba8b8a61-11bb-4215-bef7-d9bac926872f/shot_hg_blender_wire.png'
scene.render.resolution_x = 1280
scene.render.resolution_y = 720

bpy.ops.render.render(write_still=True)
print("Done render!")
