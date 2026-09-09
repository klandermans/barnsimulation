import struct
import json

with open('roblox/barn_textured.glb', 'rb') as f:
    magic, version, length = struct.unpack('<4sII', f.read(12))
    chunk_len, chunk_type = struct.unpack('<II', f.read(8))
    json_bytes = f.read(chunk_len)
    data = json.loads(json_bytes.decode('utf-8'))

nodes = data.get('nodes', [])
meshes = data.get('meshes', [])
print(f"Nodes count: {len(nodes)}")
for n in nodes:
    name = n.get('name', '')
    if any(k in name.lower() for k in ['main', 'logo', 'paving', 'straa', 'stair', 'skybox']):
        print(f"Node: {name:<35} trans:{n.get('translation', 'default')}")

