# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1] - 2025-05-10

### Fixed

- Unbundled modules remove the common indent from each line.

## [2.0.0] - 2025-02-24

### Breaking

- Changed `unbundle` to return more information instead of just the unbundled file.
  It includes all bundled files instead of just the main file.
  The previous behavior can be achieved with accessing `unbundle(xmlUi).root`.

## [1.1.0] - 2024-05-08

### Added

- Multiple include directories can now be given as a parameter
