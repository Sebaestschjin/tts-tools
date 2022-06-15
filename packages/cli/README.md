# TTS Tools - Command Line Interface

Command line interface for various tools to interact with Tabletop Simulator.

Currently the main purpose of this tool is to extract a TTS save file into multiple files and the ability to embed them again.
This allows for easier integration into source control system (because there are multiple files per object instead of one big file) and to easily update scripts and UI for objects inside containers.

## Installation

Either globally

```sh
npm install -g @tts-tools/cli
```

Or as part of another package

```sh
npm install -D @tts-tools/cli
```

## Usage

Show help information or the current version:

```sh
tts-save (--help|--version)
```

Run on of the commands (see below for details):

```sh
tts-save (extract|embed) [options]
```

### Extract command

Show help information or the current version:

```sh
tts-save extract (--help|--version)
```

Execute the command:

```sh
tts-save extract [options] <saveFile>
```

Extracts the given `saveFile`.
The ending `.json` for `saveFile` is optional.
The tool will first look for the save file in the current location.
If it can not be found there, it will attempt to find the file in the TTS save file directory.
The TTS directory will also be searched recursively, so the file can be at any nesting level.
This behavior is intended for mods where multiple people work on it and allows the developers to keep the development version of the save at any hierarchy level in the TTS save directory they desire.

Which files are generated with `extract`, is described [https://www.npmjs.com/package/@tts-tools/savefile](here).

#### Options

- `--output <dir>`, `-o <dir>`

  **Required**.

  Specifies the directory where the extracted files will be written to.
  The directory will be created if it doesn't exist yet.

- `--clean`, `-c`

  If set, the output directory will be deleted before extracting (if it exists).

- `--normalize`, `-n`

  If set, all floating point numbers will be rounded to the nearest 0.0001 value within the data files.

#### Example

Running this command:

```sh
tts-save embed (--help|--version)
tts-save embed --clean --normalize --output content GHE_Dev
```

With a TTS save file directory like this:

```
<TTS save file Path>
├─ Games
|  ├─ TS_Save_2.json
├─ GHE
|  ├─ GHE_Dev.json
|  ├─ TS_Save_3.json
├─ TS_Save_1.json
```

Will extract the file `GHE/GHE_Dev.json` from the TTS save file folder.
If the TTS save file folder doesn't contain a save file with this name somewhere, it would try to extract the file from the directory the `tts-save` command is called from.

### Embed command

Show help information or the current version:

```sh
tts-save embed (--help|--version)
```

Execute the command:

```sh
tts-save embed [options] <path>
```

Embeds a previously extracted save file and creates a new TTS save file.
While doing so, all scripts that use `require` or UI that uses `<Include />` will be updated to include the latest versions for those scripts (given the correct include path).

More details about the process can be found [https://www.npmjs.com/package/@tts-tools/savefile](here).

#### Options

- `--output <name>`, `-o <name>`

  **Required**.

  Defines there file name where the embedded save file will be written to.
  The ending `.json` is optional.
  The tool will first attempt to find a file with this name in the TTS save file directory (at any nesting).
  If it can find such a file, it will be overwritten with the embedded file.
  Otherwise the file will be written relative to the current path.

- `--inlcude <dir>`, `-i <dir>`

  Path to Lua and XML files that are include with `require()` and `<Include src="" />`.

#### Example

Running this command:

```sh
tts-save embed --output GHE_Dev --include src content
```

With a TTS save file directory like this:

```
<TTS save file Path>
├─ Games
|  ├─ TS_Save_2.json
├─ GHE
|  ├─ GHE_Dev.json
|  ├─ TS_Save_3.json
├─ TS_Save_1.json
```

And the directory where the command is called from like this:

```
<command directory>
├─ content
|  ├─ Contents
|  |  ├─ ...
|  ├─ Script.ttslua
|  ├─ UI.xml
|  ├─ ...
├─ src
|  ├─ Main.ttslua
|  ├─ Main.xml
|  ├─ ...
```

Will embed the directory from `content` and write the new save file to `GHE/GHE_Dev.json` within the TTS save file folder.
The `src` directory is used to resolve `require` and `<Include />`.
So if `content/Script.ttslua` would contain `require("Main")`, the contents of `src/Main.ttslua` will be bundled in the `Global` script.
The same applies for XML files, so if `content/UI.xml` would contain `<Include src="Main" />`, the contents of `src/Main.xml` will be bundled into the `Global` UI.
