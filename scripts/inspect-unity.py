"""Read a small Unity bundle and export textures and OBJ geometry without game code."""
import argparse
import hashlib
import json
import math
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

MAX_INPUT = 32 * 1024 * 1024
MAX_OBJECTS = 1000
MAX_TEXTURE_PIXELS = 16 * 1024 * 1024
MAX_EXPORTS = 4
MAX_PARAMETERS = 100
MAX_MESH_EXPORTS = 4
MAX_MESH_VERTICES = 50000
MAX_MESH_TRIANGLES = 100000
MAX_OBJ_BYTES = 8 * 1024 * 1024


def obj_geometry(vertices, uvs, normals, submeshes, name):
    """Write only present channels; OBJ indices are checked before any file is saved."""
    count = len(vertices)
    if not 0 < count <= MAX_MESH_VERTICES:
        raise ValueError("网格顶点为空或超过 50,000 个")
    triangle_count = sum(len(group) for group in submeshes)
    if not 0 < triangle_count <= MAX_MESH_TRIANGLES:
        raise ValueError("网格三角形为空或超过 100,000 个")
    def vectors(data, dimensions):
        for vector in data:
            if len(vector) < dimensions or any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in vector[:dimensions]):
                raise ValueError("网格包含无效坐标")
    vectors(vertices, 3)
    for channel, dimensions in [(uvs, 2), (normals, 3)]:
        if channel and len(channel) != count:
            raise ValueError("UV 或法线数量与顶点数量不一致")
        vectors(channel or [], dimensions)
    lines = [f"g {name}\n"]
    lines.extend(f"v {-v[0]:.9G} {v[1]:.9G} {v[2]:.9G}\n" for v in vertices)
    lines.extend(f"vt {uv[0]:.9G} {uv[1]:.9G}\n" for uv in uvs or [])
    lines.extend(f"vn {-n[0]:.9G} {n[1]:.9G} {n[2]:.9G}\n" for n in normals or [])
    def reference(index):
        value = str(index + 1)
        if uvs and normals:
            return f"{value}/{value}/{value}"
        if uvs:
            return f"{value}/{value}"
        if normals:
            return f"{value}//{value}"
        return value
    for number, group in enumerate(submeshes):
        lines.append(f"g {name}_{number}\n")
        for face in group:
            if len(face) != 3 or any(isinstance(i, bool) or not isinstance(i, int) or not 0 <= i < count for i in face):
                raise ValueError("网格三角形索引越界或格式不正确")
            lines.append("f " + " ".join(reference(i) for i in reversed(face)) + "\n")
    text = "".join(lines)
    if len(text.encode("utf-8")) > MAX_OBJ_BYTES:
        raise ValueError("OBJ 输出超过 8 MiB")
    return text, {"vertices": count, "triangles": triangle_count, "submeshes": len(submeshes), "uvCoordinates": len(uvs or []), "normals": len(normals or []), "objBounds": {"min": [min((-v[0], v[1], v[2])[i] for v in vertices) for i in range(3)], "max": [max((-v[0], v[1], v[2])[i] for v in vertices) for i in range(3)]}}


def mesh_geometry(mesh, filename):
    from UnityPy.helpers.MeshHelper import MeshHandler
    declared = getattr(getattr(mesh, "m_VertexData", None), "m_VertexCount", 0) or 0
    if declared > MAX_MESH_VERTICES:
        raise ValueError("网格声明顶点超过 50,000 个")
    compressed = getattr(getattr(getattr(mesh, "m_CompressedMesh", None), "m_Vertices", None), "m_NumItems", 0) or 0
    if compressed > MAX_MESH_VERTICES * 3:
        raise ValueError("网格压缩顶点超过导出限制")
    if sum(getattr(group, "indexCount", 0) or 0 for group in mesh.m_SubMeshes or []) > MAX_MESH_TRIANGLES * 3:
        raise ValueError("网格索引数量超过导出限制")
    handler = MeshHandler(mesh)
    handler.process()
    groups = handler.get_triangles()
    for index, group in enumerate(groups):
        base = getattr(mesh.m_SubMeshes[index], "baseVertex", 0) or 0
        if base:
            groups[index] = [tuple(v + base for v in face) for face in group]
    text, geometry = obj_geometry(handler.m_Vertices or [], handler.m_UV0 or [], handler.m_Normals or [], groups, filename)
    return text, {**geometry, "coordinateConversion": "Unity → OBJ：X 轴取反，同时反转三角形顶点顺序", "content": "仅几何与可用 UV/法线；未导出骨骼、动画、材质连接"}


def sha256(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def load_bundle(source_bytes):
    import UnityPy
    from fsspec.implementations.memory import MemoryFileSystem
    class BundleOnlyEnvironment(UnityPy.Environment):
        def load_file(self, file, parent=None, name=None, is_dependency=False):
            if isinstance(file, str):
                raise FileNotFoundError("本轮仅读取资源包内部资源，未加载外部分离资源文件")
            return super().load_file(file, parent, name, is_dependency)
    return BundleOnlyEnvironment(source_bytes, fs=MemoryFileSystem())


def inspect(source, output):
    import UnityPy

    if not source.is_file() or source.stat().st_size > MAX_INPUT:
        raise ValueError("请选择不超过 32 MiB 的单个 Unity 资源包")
    source_bytes = source.read_bytes()
    if len(source_bytes) > MAX_INPUT:
        raise ValueError("资源包超过 32 MiB")
    header = source_bytes[:9]
    signature = header.split(b"\0", 1)[0].decode("ascii", errors="replace")
    if signature not in {"UnityFS", "UnityRaw", "UnityWeb"}:
        raise ValueError("未发现受支持的 Unity 资源包签名")
    env = load_bundle(source_bytes)
    objects = []
    truncated = False
    for obj in env.objects:
        if len(objects) >= MAX_OBJECTS:
            truncated = True
            break
        objects.append(obj)
    if not objects:
        raise ValueError("资源包中没有读取到对象")
    output.mkdir(parents=True, exist_ok=False)
    parameters, exports, mesh_exports, warnings = [], [], [], []
    inventory = []
    numeric_fields = {
        "Texture2D": ["m_Width", "m_Height", "m_MipCount", "m_TextureFormat"],
        "Sprite": ["m_PixelsToUnits", "m_Rect.width", "m_Rect.height"],
        "Mesh": ["m_VertexData.m_VertexCount", "m_MeshCompression", "m_IndexFormat", "m_SubMeshes[0].indexCount", "m_LocalAABB.m_Center.x", "m_LocalAABB.m_Center.y", "m_LocalAABB.m_Center.z", "m_LocalAABB.m_Extent.x", "m_LocalAABB.m_Extent.y", "m_LocalAABB.m_Extent.z"],
    }
    for obj in objects:
        kind = obj.type.name
        identity = {"assetFile": obj.assets_file.name, "pathId": str(obj.path_id), "type": kind}
        row = {**identity, "name": ""}
        inventory.append(row)
        if kind not in numeric_fields:
            continue
        try:
            tree = obj.parse_as_dict()
            row["name"] = str(tree.get("m_Name", ""))[:200]
            for field in numeric_fields[kind]:
                value = tree
                for segment in re.findall(r"[^.\[\]]+", field):
                    if isinstance(value, list) and segment.isdigit() and int(segment) < len(value):
                        value = value[int(segment)]
                    else:
                        value = value.get(segment) if isinstance(value, dict) else None
                if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and len(parameters) < MAX_PARAMETERS:
                    parameters.append({**identity, "name": row["name"], "field": field, "value": value, "meaning": "资源序列化参数；未验证游戏运行时行为"})
            if kind == "Mesh":
                if len(mesh_exports) >= MAX_MESH_EXPORTS:
                    warnings.append({**identity, "message": "本轮最多导出四个 Mesh；此网格未导出"})
                    continue
                filename = f"mesh-{len(mesh_exports) + 1}.obj"
                text, geometry = mesh_geometry(obj.parse_as_object(), Path(filename).stem)
                destination = output / filename
                with destination.open("x", encoding="utf-8", newline="\n") as stream:
                    stream.write(text)
                mesh_exports.append({**identity, "name": row["name"], "file": filename, **geometry, "bytes": destination.stat().st_size, "sha256": sha256(destination)})
                continue
            if kind != "Texture2D" or len(exports) >= MAX_EXPORTS:
                continue
            width, height = tree.get("m_Width", 0), tree.get("m_Height", 0)
            if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0 or width * height > MAX_TEXTURE_PIXELS:
                warnings.append({**identity, "message": "贴图尺寸超出本轮导出限制"})
                continue
            image = obj.parse_as_object().image
            if image.size != (width, height):
                raise ValueError("导出的图像尺寸与资源字段不一致")
            filename = f"texture-{len(exports) + 1}.png"
            destination = output / filename
            image.save(destination, format="PNG")
            exports.append({**identity, "name": row["name"], "file": filename, "width": width, "height": height, "bytes": destination.stat().st_size, "sha256": sha256(destination)})
        except Exception as error:
            warnings.append({**identity, "message": str(error)[:300]})
    result = {
        "format": "rea-unity-evidence-v1",
        "scanner": "rea-workbench/unitypy-resource-scan",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "tool": {"name": "UnityPy", "version": UnityPy.__version__},
        "source": {"path": str(source), "bytes": len(source_bytes), "sha256": hashlib.sha256(source_bytes).hexdigest(), "signature": signature},
        "unityVersions": sorted({str(obj.assets_file.unity_version) for obj in objects}),
        "counts": dict(Counter(obj.type.name for obj in objects)),
        "objects": inventory,
        "parameters": parameters,
        "exports": exports,
        "meshExports": mesh_exports,
        "warnings": warnings,
        "truncated": truncated,
        "limits": {"inputBytes": MAX_INPUT, "objects": MAX_OBJECTS, "texturePixels": MAX_TEXTURE_PIXELS, "textureExports": MAX_EXPORTS, "parameters": MAX_PARAMETERS, "meshExports": MAX_MESH_EXPORTS, "meshVertices": MAX_MESH_VERTICES, "meshTriangles": MAX_MESH_TRIANGLES, "objBytes": MAX_OBJ_BYTES},
        "limitations": ["读取单个自包含资源包，最多导出四张贴图和四个 Mesh；不执行游戏脚本，未加载目录外分离资源。", "OBJ 包含几何和可用 UV/法线；不包含骨骼、动画、材质连接或场景对象变换，不保证能直接替换游戏人物。", "字段值来自资源序列化数据；不等于游戏生命值、天气算法或完整运行逻辑。", "没有执行 IL2CPP / Mono 反编译、音频转换、完整工程重建或游戏内修改验证。", "输入大小、对象和图像数量有上限；第三方解析器不是处理任意恶意文件的安全沙箱。"],
    }
    (output / "evidence.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = ["# Unity 资源实测报告", "", f"输入：{source}", f"SHA-256：{result['source']['sha256']}", f"工具：UnityPy {UnityPy.__version__}", f"资源包签名：{signature}", f"Unity 版本：{', '.join(result['unityVersions'])}", "", "## 对象清单", "", "| 类型 | 读取数量 |", "|---|---:|"]
    lines.extend(f"| {kind} | {count} |" for kind, count in result["counts"].items())
    lines.extend(["", "## 实际资源参数", "", "路径 ID 以字符串记录，避免 JavaScript 大整数精度丢失。字段可以在 evidence.json 中逐项核对。", "", "| 资源文件 | 对象 ID | 字段 | 值 |", "|---|---|---|---:|"])
    lines.extend(f"| {p['assetFile']} | {p['pathId']} | {p['field']} | {p['value']} |" for p in parameters)
    lines.extend(["", "## 已导出贴图", ""])
    lines.extend(f"- [{item['file']}]({item['file']})：{item['width']} × {item['height']}，SHA-256 {item['sha256']}" for item in exports)
    lines.extend(["", "## 已导出 OBJ 网格", ""])
    lines.extend(f"- [{item['file']}]({item['file']})：{item['vertices']} 顶点、{item['triangles']} 三角形、{item['uvCoordinates']} UV、{item['normals']} 法线。来源 {item['assetFile']} / {item['pathId']}，SHA-256 {item['sha256']}。{item['coordinateConversion']}；{item['content']}。" for item in mesh_exports)
    lines.extend(["", "## 限制", ""] + ["- " + item for item in result["limitations"]])
    if warnings:
        lines.extend(["", "## 未完成项", ""] + [f"- {item['pathId']}：{item['message']}" for item in warnings])
    (output / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {**result, "outputDirectory": str(output), "evidencePath": str(output / "evidence.json"), "reportPath": str(output / "report.md")}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        result = inspect(Path(args.input).resolve(), Path(args.output).resolve())
        print(json.dumps(result, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)
