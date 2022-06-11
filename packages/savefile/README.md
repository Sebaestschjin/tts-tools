# TTS Tools - Save file

This module splits a save file from Tabletop Simulator into multiple files.
It can also embed the split files again to create an updated save file while also updating the Lua and XML scripts while doing so.

# Installation

```sh
npm install @tts-tools/savefile
```

# Usage

## Extract

```ts
import { extractSave, SaveFile } from "@tts-tools/savefile";
import { readFileSync } from "fs";

// first read the save file from somewhere, e.g. using fs
const saveFile = readFileSync("<path_to_savefile") as SaveFile;

// then extract the save file to some path
extractSave(saveFile, { output: "<path_to_output>" });
```

## Embed

```ts
import { embedSave } from "@tts-tools/savefile";

// given a path to the previous extracted save, it returns the embedded save again
const saveFile = embedSave("<path_to_extracted_savefile", {
  includePath: "<path_to_includes>",
});
```

# Extract

Extracting a save file splits it into a nested directory structure.
Each folder contains the information for one object (or Global).
It contains different files per object, depending on what attributes it has (listed in the sections below).
The files all have the same name, they are discriminated by the directory they are part of.

The data from Global will be on the top level of the output directory.
From there the directory `Contents` contains the globally available objects.
Object directories are named by using their nickname (the applied name that is also visible in the TTS tooltip), followed by a dot and their GUID.
If the object doesn't have nickname, their internal name is used instead.
If the object is a container (a bag or deck), it's content is again nested inside the `Contents` directory.
The same applies for states

This process will create a directory structure like this:

```
<output-path>
├─ Data.json
├─ Contents.json
├─ Script.ttslua
├─ State.txt
├─ UI.xml
├─ Contents -- since this is Global, this contains all global objects
│ ├─ Bag.abc123
| | ├─ Contents.json
| | ├─ Data.json
| │ ├─ Script.ttslua
| | ├─ State.txt
| | ├─ States.json
| | ├─ UI.xml
| | ├─ Contents -- this object is a container, so this contains the contained objects
| | | ├─ CoolFigure.123456
| | ├─ States -- when the object is stated, the states are kept here
| | | ├─ 2-OtherBag.123456
| | | ├─ 3-MoreOtherBag.111111
│ ├─ HandTrigger.123abc
```

## `Script.ttslua`

This file contains the Lua script attached to the object (or Global).
If the script contains `require()` calls, it will be unbundled, so that only the root module will be written to the file.
E.g. this is the same behavior seen in the Atom TTS plugin, so that only the relevant code is written to the file.

**NOTE**: This tool does not (and does not intend to) support the use of the `#include` directive that is available in the Atom TTS plugin.
Please use `require()` instead.

## `UI.xml`

This file contains the XML UI attached to the object (or Global).
Like the script it will be unbundled, so it contains the `<Include src="" />` directives from the original code similar to the behavior from the Atom TTS plugin.

## `State.txt`

This file contains the script state of the object (or Global).

## `Data.json`

This file contains the data from the original save file for this object (or Global).
Fields that where extracted (e.g. the Lua script or XML UI), will be empty and not included in the file.
Adding contents to those fields will be ignored as their contents is solely driven by the available files for this object.

## `Contents.json`

This file keeps the order of contained elements within a container or the globally available objects in case of Global.
It contains a simple array with the relative path to the object within the `Contents` directory.

## `States.json`

This file keeps the order of states of an object.
It contains a simple array with the relative path to the object within the `States` directory.

# Embed

Embedding reads the directory of a previously extracted save file and recreates it again.
While doing so, it will also bundle the scripts and XML files of all objects again (even the ones inside containers) from a given include path.

Changing data before embedding is also possible.

To change the object's data (e.g. it's tags or nickname), simply edit the `Data.json`.
In case of changing the nickname or GUID of the object, renaming the directory to mimic this change is not required.

To change the script, XML UI or script state, simply edit the `Script.ttslua`, `UI.xml` or `State.txt` file.
Deleting those file will remove the script/XML UI /script state for this object.

To add contents into a container you have to do two things:

- Add all relevant files into the `Contents` directory of the container.
- Add an entry to the `Contents.json` of the container and point to the directory of the added object.

The same applied for removing objects from a container.
So you have to remove the directory from within `Contents` and remove the entry from the `Contents.json`.

The `Contents.json` also contains the order of elements inside the container.
If you want to change that order, rearrange the entries to your needs.

Adding, removing states also works the same, but uses `States` directory and `States.json` file instead.
