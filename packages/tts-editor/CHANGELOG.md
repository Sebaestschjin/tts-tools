# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.2] - 2025-05-13

### Fixed

- Fixes "Go To Error" not finding the module if it has multiple `.` in its name.

## [2.1.1] - 2025-05-10

### Fixed

- Fixes loading scripts for objects which contain line breaks in their name.

## [2.1.0] - 2025-05-10

### Changed

- The objects scripts are now written to the subdirectory `objects` inside the `.tts` output folder.
  You're advised to clean up and delete the remaining files in the `.tts` output once after updating to not confuse them with the actual used files.

### Add

- XML files are also unbundled when using the "Unbundle Library" command.
- XML files now also use multiple lookup paths during bundling just like Lua files.
- The `libray` path will be included in the lookup path to bundle Lua and XML files.

### Fixed

- Fixes "Go To Error" not finding the module if it has a `.` in its name.

## [2.0.0] - 2025-02-24

### Breaking

- Removed (undocumented) support for TSTL.
- Minimum VS Code version bumped to 1.96.0.

### Changed

- "Go To Error" now tries to locate and open the actual script file instead of always opening the bundled file.

### Added

- `require` can resolve `index.lua` files without explicitly including them in the module name.
- Command "Go to Last Error" added which opens the error line of the last reported error message.
- Command "Unbundle Library" added to reconstruct the file structure from `require`d modules.

## [1.1.0] - 2024-01-16

### Added

- The execute code command can take a parameter so that it's usable from other extension

### Changed

- Using the "Execute code" command while having a selection in the active editor now only executes the selected text instead of the whole file

## [1.0.1] - 2024-01-11

### Fixed

- Default base path to look for imports is the workspace directory instead of `src`
- Fixes the preview image in the marketplace

## [1.0.0] - 2024-01-10

### Added

- Adds command to add UI file from object view
- Adds command to get objects and save and play to object view toolbar
- Adds command to get and update the current state of an object
- Adds macro functions for executing Lua scripts to interact with VS Code
- Adds walkthrough

## [0.3.0] - 2024-01-05

### Added

- Adds a view that lists the objects in the game that have scripts attached
- Adds a command to show the current UI of an object as a file
- Adds a command to locate an object on the table
- Save and play can be used with the bundled scripts as well

### Fixed

- Fixes extension activation event for workspaces containing `.lua` or `.ttslua` files

## [0.2.0] - 2024-01-04

- Initial release
