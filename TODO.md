# TODO

## Now

* Improve lua fallback to be closer to the JS?
* Need test cases to be a little more strategic?
  * Fix tt overflow bug
* verify usage documentation is aligned (specs, wiki doc page, visual test page)
* Test the export file
  * How will MediaWiki handle "duplicate" pages?
  * Document easy docker setup for this
* Undefined behavior (document the results)
  * What actually happens when the language isn't english? Does the i18n date give non-english month names?
* audit code for readability and obviousness
  * Maybe do a little work to make styling and regional time formats be better supported?
  * Don't force en-us for formatting? Or at least not for getting a timezone short name.
  * What timezone formats are supported as inputs? +8, UTC+8, etc? Note in spec.
  * Should we be minimizing the output?

## Later

* improve visual test page
  * Support enter-your-own call to lua?
    * Would need WASM Lua. No official Scribunto or Lua 5.1 WASM, but wasmoon (Lua 5.4) and Fengari (Lua 5.3) exist.
