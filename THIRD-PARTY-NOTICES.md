# Third-party components

REA Workbench's own code follows the MIT license in LICENSE. Third-party components retain their own notices and licenses.

- Node.js 24.21.0: official Windows binary checked against the recorded SHASUMS256 checksum; full runtime LICENSE is included in runtime/LICENSE.
- CPython 3.12.14: Python Software Foundation license and bundled component notices in runtime/python/LICENSE.txt.
- rea-agents 6.4.0: MIT, https://github.com/morluto/rea; package licenses and other Node dependency licenses remain within node_modules.
- UnityPy 1.25.4: MIT, https://github.com/K0lb3/UnityPy. Python dependency versions are recorded in docs/unity/requirements.txt; distribution metadata and license files remain within runtime/python/Lib/site-packages.
- Public interface fonts and artwork: attribution/license files supplied alongside those assets in public are retained.

Large ArtCraft and game source snapshots are optional downloads, with provenance in samples and original licenses kept with the downloaded sources. Unity upstream sample binaries, reference artwork and extracted test results are excluded from the release archive. The release never includes local AI credentials, workbench user data or the author's virtual environment configuration.
