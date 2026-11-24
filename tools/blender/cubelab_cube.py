"""
CubeLab: GAN-style stickerless 3x3 cube for Blender 5.2
Run in Blender: Scripting tab > Open this file > Run Script.
It clears the scene, builds 26 cubies, adds materials, studio lights,
a glossy floor, a glowing backdrop and a camera.
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix

# ---------- settings you can change ----------
TWIST_TOP_DEG = 22          # twist the top layer for a dynamic shot (0 = solved, straight)
GLOW_COLOUR = "#FF6A1A"     # colour of the light behind the cube
RENDER_SAMPLES = 128
# face colours: R, L, U, D, F, B (GAN-like bright plastic)
COLOURS = {"R": "#F0232C", "L": "#FF8A1C", "U": "#F5F5F1",
           "D": "#FFE01A", "F": "#2FCF5A", "B": "#1B6BFF"}
TILE = 0.88        # tile width before rounding
BIG_R = 0.30       # corner radius where tiles meet the holes around a centre
SMALL_R = 0.06     # other corners
TILE_THICK = 0.05


def srgb_to_linear(hex_str):
    h = hex_str.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def plastic(name, hex_colour, rough=0.3, coat=0.35):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = srgb_to_linear(hex_colour)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = 0.15
    return m


def rounded_outline(half, radii, seg=10):
    """Corners in order: bottom-left, bottom-right, top-right, top-left (counter-clockwise)."""
    centres = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    start_angle = [180, 270, 0, 90]
    pts = []
    for (sx, sy), r, a0 in zip(centres, radii, start_angle):
        cx, cy = sx * (half - r), sy * (half - r)
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def make_tile_mesh(name, radii):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((x, y, 0)) for x, y in rounded_outline(TILE / 2, radii)]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    top = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=top, vec=(0, 0, TILE_THICK))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    return me


def add_bevel(obj, width, segments):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.harden_normals = True
    for poly in obj.data.polygons:
        poly.use_smooth = True


def build_cube():
    body_mat = plastic("Body", "#060606", rough=0.5, coat=0.0)
    face_mats = {k: plastic("Tile_" + k, v) for k, v in COLOURS.items()}
    # face: (normal, up vector, colour key)
    faces = [((1, 0, 0), (0, 0, 1), "R"), ((-1, 0, 0), (0, 0, 1), "L"),
             ((0, 0, 1), (0, 1, 0), "U"), ((0, 0, -1), (0, -1, 0), "D"),
             ((0, -1, 0), (0, 0, 1), "F"), ((0, 1, 0), (0, 0, 1), "B")]
    tile_meshes = {}
    root = bpy.data.objects.new("CubeLab_Cube", None)
    bpy.context.collection.objects.link(root)

    for x in (-1, 0, 1):
        for y in (-1, 0, 1):
            for z in (-1, 0, 1):
                if x == y == z == 0:
                    continue
                home = Vector((x, y, z))
                bpy.ops.mesh.primitive_cube_add(size=0.96, location=home)
                body = bpy.context.object
                body.name = f"Cubie_{x}_{y}_{z}"
                body.data.materials.append(body_mat)
                add_bevel(body, 0.11, 5)
                body.parent = root
                for n, up, key in faces:
                    n, up = Vector(n), Vector(up)
                    if home.dot(n) != 1:
                        continue
                    right = up.cross(n)
                    a, b = round(home.dot(right)), round(home.dot(up))
                    radii = []
                    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                        inner = abs(a + sx * 0.5) == 0.5 and abs(b + sy * 0.5) == 0.5
                        radii.append(BIG_R if inner else SMALL_R)
                    mkey = tuple(radii)
                    if mkey not in tile_meshes:
                        tile_meshes[mkey] = make_tile_mesh("TileMesh", radii)
                    tile = bpy.data.objects.new(f"Tile_{key}", tile_meshes[mkey].copy())
                    bpy.context.collection.objects.link(tile)
                    tile.data.materials.append(face_mats[key])
                    basis = Matrix((right, up, n)).transposed().to_4x4()
                    tile.matrix_world = Matrix.Translation(home + n * 0.455) @ basis
                    add_bevel(tile, 0.022, 4)
                    tile.parent = body
                    tile.matrix_parent_inverse = body.matrix_world.inverted()
    return root


def twist_top(deg):
    if not deg:
        return
    rot = Matrix.Rotation(math.radians(deg), 4, "Z")
    for obj in bpy.data.objects:
        if obj.name.startswith("Cubie_") and obj.name.endswith("_1") and obj.location.z > 0.5:
            obj.matrix_world = rot @ obj.matrix_world


def area_light(name, loc, size, power, colour="#FFFFFF", size_y=None, target=(0, 0, 0)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = srgb_to_linear(colour)[:3]
    if size_y:
        data.shape = "RECTANGLE"
        data.size, data.size_y = size, size_y
    else:
        data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    direction = Vector(target) - Vector(loc)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj


def build_studio():
    # glossy black floor
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, -1.515))
    floor = bpy.context.object
    floor.name = "Floor"
    fm = plastic("FloorMat", "#050505", rough=0.12, coat=0.0)
    floor.data.materials.append(fm)
    # backdrop wall far behind, lit by the glow light
    bpy.ops.mesh.primitive_plane_add(size=40, location=(-7.2, 9.6, 2), rotation=(math.radians(90), 0, math.radians(36.87)))
    wall = bpy.context.object
    wall.name = "Backdrop"
    wall.data.materials.append(plastic("WallMat", "#262626", rough=0.9, coat=0.0))
    # lights
    area_light("Key", (-5, -5, 6), 4, 900)                                     # big softbox front-left
    area_light("Top_strip", (0, -1, 7), 7, 650, size_y=0.8)                     # long highlight on top edges
    area_light("Fill", (7, -3, 5), 3, 160)                                    # soft fill from the right
    area_light("Rim", (2, 5.5, 6.5), 3, 1600, GLOW_COLOUR)                       # coloured rim on the back edges
    glow = area_light("Glow", (-2.6, 3.5, 0.2), 6, 16000, GLOW_COLOUR, target=(-7.2, 9.6, 2.0))  # paints the wall behind
    glow.visible_glossy = False   # keep the light itself out of the floor reflection
    glow.visible_camera = False
    # world: black
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0


def build_camera():
    data = bpy.data.cameras.new("Camera")
    data.lens = 60
    cam = bpy.data.objects.new("Camera", data)
    bpy.context.collection.objects.link(cam)
    cam.location = (8.4, -11.2, 6.2)
    target = bpy.data.objects.new("CamTarget", None)
    bpy.context.collection.objects.link(target)
    target.location = (0, 0, -0.25)
    c = cam.constraints.new("TRACK_TO")
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    bpy.context.scene.camera = cam


def setup_render():
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.samples = RENDER_SAMPLES
    s.cycles.use_denoising = True
    s.render.resolution_x = 1600
    s.render.resolution_y = 1200
    s.view_settings.view_transform = "AgX"
    s.view_settings.exposure = 0.3
    try:
        s.view_settings.look = "AgX - Punchy"
    except TypeError:
        pass


clear_scene()
build_cube()
twist_top(TWIST_TOP_DEG)
build_studio()
build_camera()
setup_render()
print("CubeLab cube ready. Press F12 to render.")
