import bpy
src = open('cubelab_cube.py').read().replace('TWIST_TOP_DEG = 22', 'TWIST_TOP_DEG = 0')
exec(src)
bpy.ops.object.select_all(action='DESELECT')
root = bpy.data.objects['CubeLab_Cube']
root.select_set(True)
for o in root.children_recursive: o.select_set(True)
bpy.ops.export_scene.gltf(filepath='cubelab_cube.glb', export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
