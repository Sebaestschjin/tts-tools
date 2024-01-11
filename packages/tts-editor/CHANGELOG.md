# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The execute code command can take a parameter so that it's usable from other extension

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
