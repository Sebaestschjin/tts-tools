# TTS Tools - XML Bundle

`xmlbundle` is a module to bundle and unbundle XML UI files from Tabletop Simulator.
It mimics the behavior for XML files of the [TTS Atom plugin](https://api.tabletopsimulator.com/atom/).

# Installation

```sh
npm install -D @tts-tools/xmlbundle
```

# Usage

To bundle a XML UI, use the `bundle` function from the `xmlbundle` module.
It takes the XML content as a `string` and the include directory where additional files can be found and returns the bundled XML.

Files can be included by adding `<Include src="file_path" />` into the XML.
`file_path` is a relative path starting from the given include directory.
It can contain the ending `.xml` at the end, but that's not a requirement.

When an included file also contains includes, the path of the included file will be used as the root path to search for those additional includes.

# Examples

## Simple

Given a file named `main.xml` with the following content:

```xml
<Panel id="main" />
```

This bundling call:

```ts
import { bundle } from "@tts-tools/xmlbundle";

const input = '<Include src="main" />';

const bundled = bundle(input, "<include_directory>");
console.log(bundled);
```

Will result in this output:

```xml
<!-- include main -->
<Panel id="main">
<!-- include main -->
```

The reverse happens during `unbundle` (but it won't create the file).

## Nested

Given the following directory structure:

```
<include_directory>
├─ main.xml
└─ nested
   ├─ main.xml
   └─ index.xml
```

And those XML Files:

`main.xml`:

```xml
<Include src="nested/index>
```

`nested/index.xml`:

```xml
<Include src="main" />
```

`nested/main.xml`

```xml
<Panel id="nested_main" />
```

Bundling the content of `main.xml` will result in this output:

```xml
<!-- include nested/index -->
<!-- include main -->
<Panel id="nested_main" />
<!-- include main -->
<!-- include nested/index -->
```

# Copyright and License

No rights reserved.

The author has dedicated the work to the Commons by waiving all of his or her rights to the work
worldwide under copyright law and all related or neighboring legal rights he or she had in the work,
to the extent allowable by law.

Works under CC0 do not require attribution. When citing the work, you should not imply endorsement by the author.
