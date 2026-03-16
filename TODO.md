# TODO

## Now

* Improve lua fallback to be closer to the JS?
  * Include style classes?
    * This could interfere with the current no-JS demo
* audit code for readability and obviousness
* Re-organize "supported" and "not-supported" notes in README

## Later

* improve visual test page
  * Support enter-your-own call to lua?
    * Would need WASM Lua. No official Scribunto or Lua 5.1 WASM, but wasmoon (Lua 5.4) and Fengari (Lua 5.3) exist.
* Support a custom separator word, like 'to' or 'until'
* Support additional locale adjustments. This would still assume an English wiki that shouldn't mix and match month names or other text.
  * day month year (Europe)
    * Duplicate month: `1 Mar, 13:00 – 5 Mar, 16:00 EDT`
    * Deduped month: `1–5 March, 13:00 – 16:00 EDT`
      * Note removed spacing on date range and long month name
      * Might be "too aggressive" at trying to save space
  * year month day (Asia)
    * Duplicate month: `Mar 1, 13:00 – Mar 5, 16:00 EDT`
    * Deduped month: `Mar 1, 13:00 – 5, 16:00 EDT`
      * This might actually feel and read naturally for these visitors
  * Can detect order preference in visitor's locale's time format
    * Detect order by which is first: day, month, or year
    * Detect 12 or 24 hour format
  * Could support a gadget preference for order and 12 vs 24 hour.
