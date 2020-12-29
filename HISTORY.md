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
