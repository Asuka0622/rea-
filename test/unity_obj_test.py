import importlib.util
import math
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("reader", Path(__file__).resolve().parent.parent / "scripts" / "inspect-unity.py")
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
VERTICES = [(0, 0, 0), (1, 0, 0), (0, 1, 0)]
UVS = [(0, 0), (1, 0), (0, 1)]
NORMALS = [(0, 0, 1)] * 3
FACES = [[(0, 1, 2)]]


class ObjValidation(unittest.TestCase):
    def test_external_file_dependencies_are_not_read(self):
        bundle = Path(__file__).resolve().parent.parent / "samples" / "unity" / "atlas_test.bundle"
        if not bundle.is_file():
            self.skipTest("Official binary fixture not downloaded")
        env = reader.load_bundle(bundle.read_bytes())
        self.assertEqual(len(env.objects), 10)
        self.assertEqual(env.fs.protocol, "memory")
        with self.assertRaises(FileNotFoundError):
            env.load_file(str(Path(__file__).resolve()), is_dependency=True)

    def test_uv_only_does_not_reference_absent_normals(self):
        text, geometry = reader.obj_geometry(VERTICES, UVS, [], FACES, "mesh")
        self.assertIn("f 3/3 2/2 1/1\n", text)
        self.assertNotIn("vn ", text)
        self.assertEqual(geometry["normals"], 0)
        self.assertEqual(geometry["objBounds"]["min"], [-1, 0, 0])

    def test_faces_use_only_available_channels(self):
        for uvs, normals, expected in [([], [], "f 3 2 1"), ([], NORMALS, "f 3//3 2//2 1//1"), (UVS, NORMALS, "f 3/3/3 2/2/2 1/1/1")]:
            with self.subTest(expected=expected):
                text, _ = reader.obj_geometry(VERTICES, uvs, normals, FACES, "mesh")
                self.assertIn(expected + "\n", text)

    def test_invalid_indices_coordinates_and_channel_counts_fail(self):
        invalid = [(VERTICES, UVS, [], [[(0, 1, 3)]]), (VERTICES, UVS, [], [[(-1, 1, 2)]]), (VERTICES, UVS, [], [[(0, True, 2)]]), ([(math.nan, 0, 0)] + VERTICES[1:], UVS, [], FACES), (VERTICES, UVS[:2], [], FACES)]
        for args in invalid:
            with self.subTest(args=args):
                with self.assertRaises(ValueError):
                    reader.obj_geometry(*args, "mesh")

    def test_empty_and_oversized_geometry_fail(self):
        for vertices, faces in [([], FACES), (VERTICES, [[]]), ([(0, 0, 0)] * (reader.MAX_MESH_VERTICES + 1), FACES), (VERTICES, [[(0, 1, 2)] * (reader.MAX_MESH_TRIANGLES + 1)])]:
            with self.assertRaises(ValueError):
                reader.obj_geometry(vertices, [], [], faces, "mesh")


if __name__ == "__main__":
    unittest.main()
