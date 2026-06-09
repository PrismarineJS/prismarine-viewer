### 1.33.0
* [Fix headless (#436)](https://github.com/PrismarineJS/prismarine-viewer/commit/1bcd495ba8ab067c163d7653609276b27d8c41e9) (thanks @caenopy)

### 1.32.0
* [Update to node 22 (#453)](https://github.com/PrismarineJS/prismarine-viewer/commit/774d578e5b02af5112a112b9ebd70bbc2e16a5eb) (thanks @rom1504)

### 1.31.0
* [1.21.4 (#452)](https://github.com/PrismarineJS/prismarine-viewer/commit/cf65208c2df9520dba8d8bc00ce9cc9f63edbe78) (thanks @SuperGamerTron)

### 1.30.0
* [Support 1.21.1 (New) (#450)](https://github.com/PrismarineJS/prismarine-viewer/commit/859f8d95a97db54ba9f301236e69fb7f18f0505b) (thanks @SuperGamerTron)
* [Update ci.yml actions/upload-artifact (#448)](https://github.com/PrismarineJS/prismarine-viewer/commit/c2c89a16fd65f05b017089f7b2246ec92218a963) (thanks @extremeheat)

### 1.29.0
* [Update upload action](https://github.com/PrismarineJS/prismarine-viewer/commit/db8bfb0f9745d4b26ce73e07b9b92c586e727117) (thanks @rom1504)
* [Added support for proxy (#429)](https://github.com/PrismarineJS/prismarine-viewer/commit/02b74ff8b84263c49b61d38626dedc7b18afd61a) (thanks @sefirosweb)
* [Bump actions/download-artifact from 2 to 4.1.7 in /.github/workflows (#433)](https://github.com/PrismarineJS/prismarine-viewer/commit/f24ea1572d10953eab4a7181a61ee45d310d680e) (thanks @dependabot[bot])
* [Bump @tweenjs/tween.js from 19.0.0 to 23.1.1 (#424)](https://github.com/PrismarineJS/prismarine-viewer/commit/b7624c36b908ab7bcd41e2d9af4e94c4dad1425e) (thanks @dependabot[bot])
* [Update publish.yml to node 18](https://github.com/PrismarineJS/prismarine-viewer/commit/cd324fe1ed7840eef677100d322d06e3dc08e859) (thanks @rom1504)

### 1.28.0
* [Handle missing biome data.](https://github.com/PrismarineJS/prismarine-viewer/commit/853d226615526f6cd0ba2296eb88958d78aee175) (thanks @rom1504)

### 1.27.0
* [World rendering improvements (#408)](https://github.com/PrismarineJS/prismarine-viewer/commit/4265ad7e6daf8d8b9388d59a0656e3b23a355661) (thanks @zardoy)

### 1.26.2
* [Roll back/update tweenjs to 19.0.0 (latest working version) (#415)](https://github.com/PrismarineJS/prismarine-viewer/commit/f5f44852e9dd59730d3aa798a2e6c73f5f335613) (thanks @SilkePilon)

### 1.26.1

* Fix version check.

### 1.26.0

* Fix redstone_wire rendering (@nova-27)
* Improve version support and add support for 1.19 and 1.20. (@rom1504)

### 1.25.0

* Remove unused mc-data from bundle

### 1.24.0

* Fix threejs disposal
* Expose ambientLight and directionalLight

### 1.23.0

* Bumb Mineflayer to 4.x
* Bumb Mineflayer-pathfinder to 2.x
* Bumb fs-extra to 10.x
* Bumb minecraft-data to 3.x

### 1.22.0

* support 1.18.0

### 1.21.0

* Dependency bumb
* Pin three dependency
* Fixed a few memory leaks
* Add waitForChunksToRender() function

### 1.20.0

* 1.17.1 support

### 1.19.3

* Fix standalone

### 1.19.2

* biome cache bug fix

### 1.19.1

* Lighten ao slightly
* Fix some missing rotations
* Fix some entity texture paths

### 1.19.0

* Add tints (thanks @Moondarker)

### 1.18.2

* Use entity name correctly

### 1.18.1

* Fix self ghost entity

### 1.18.0

* Add names above players

### 1.17.0

* expose version in viewer

### 1.16.2

* properly fix water bug
* improve input perfs

### 1.16.1

* fix rendering bug

### 1.16.0

* Fix bugs
* Improve water rendering

### 1.15.1

* Improve entity rendering
* Fix entity name matching on older versions

### 1.15.0

* Interpolate movements
* Add entity models

### 1.14.0

* Add viewer.close()
* Use real entity height and width
* Add points primitive

### 1.13.0

* make init and updatePosition not blocking for a faster apparent rendering
* use production mode webpack

### 1.12.0
* add keyboard controls (@extremeheat)

### 1.11.1
* use iterators from pworld

### 1.11.0
* 1.16.4 support
* Fix rotations

### 1.10.0

* Add prefix option
* Paste schematic in standalone example

### 1.9.3

* electron path fix

### 1.9.0

* Refactor package to expose rendering api
* Add electron demo
* Add static standalone demo

### 1.8.0

* Fix dirty chunk unloading bug (thanks @extremeheat)
* Add blockClicked event and clickmove example

### 1.7.0

* Added headless rendering
* Added writing to video file example
* Added streaming to python example
* Fixed camera rotation

### 1.6.0

* Model rotations (thanks @iRath96)
* Handling transparent blocks better (thanks @iRath96)
* Implement multi-part block models (thanks @iRath96)
* Respects pixel device ratios (thanks @iRath96)
* Fixed UV coordinates for blocks like hoppers (thanks @iRath96)
* Liquids should be 14px instead of 16px high (thanks @iRath96)

### 1.5.0

* Cache blocks for a 30% performance increase
* Enable compression

### 1.4.0

* Use more than 1 worker thread for mesh generation

### 1.3.0

* stop using bot._columns
* first person vision
* Basic liquids implementation
* Fixed canvas CSS

### 1.2.2

* Fix changing dimensions (in mineflayer)
* Improve examples

### 1.2.1

* Protect diverse null/undefined values

### 1.2.0

* Dynamic loading/unloading of chunks

### 1.1.0

* Build mesh into a separate worker thread

### 1.0.2

* Use correct textures and models for most of the blocks

### 1.0.1

* Fix import of src/index.js

### 1.0.0

* Initial version, API is not 100% stable but it works
