# TODO

* align usage documentation (specs, wiki doc page, visual test page)
  * Need to support at least on-wiki and on-web
  * Need test cases to be a little more strategic? Maybe show js, nojs, and wiki all together? Not sure we really need a test case for every possible situation. It would be overwhelming.
* improve visual test page
  * Support enter-your-own call to lua? (may need wasm Lua...)
  * rely on lua (either at build time or in the browser) instead of hardcoded lua outputs
    * Could have build-time lua be an optional step with cached output json
    * Would need shims for mw stuff
* Link the export file for mediawiki to import
  * Figure out what MediaWiki:Gadgets-definition could look like if auto-imported.
  * How will MediaWiki handle "duplicate" pages?
* audit code for readability and obviousness
  * Maybe do a little work to make styling and regional time formats be better supported?
  * What timezone formats are supported as inputs?
  * error visibility when given a bad (or likely bad) input?
* Bugs
  * Tooltip supports click to open. Stays open when clicking again. Is that expected? Maybe close on second click? And/or just make it being open be tap only? Currently tabbable. Is that a good idea?
  * The server configs are hardcoded, but should live in json.
* Undefined behavior (document the results)
  * What if someone puts it in a header, in italics text, etc?
  * How are we handling timezone abbreviation changes locally? e.g. DST starting/ending in the middle. It doesn't look like it...
  * What actually happens when the language isn't english? Does the i18n date give non-english month names?
* Tooling or advice to help find dates that aren't using the template?
