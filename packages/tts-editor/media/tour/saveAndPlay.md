Save and play send your updated scripts back to TTS.
It will also reload the game afterwards.
This also means that all "physical" changes you did to the table (e.g. adding objects, moving them around) will be lost and the last save you loaded in TTS will be restored.

Save and play will also bundle your Lua scripts that use `require` as well as your XML scripts that use `<Include src="" />` before sending them to TTS.
Learn more about bundling scripts [here](https://sebaestschjin.github.io/tts-tools/editor/latest/bundling.html).

Want to edit a mod that uses bundling, but you don't have the original files?
You can also edit the bundled version of the scripts and use Save and Play with those version.
Checkout [this documentation](https://sebaestschjin.github.io/tts-tools/editor/latest/bundling.html#saveAndPlay) for details.
