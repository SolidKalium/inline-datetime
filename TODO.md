# TODO

* verify usage documentation is aligned (specs, wiki doc page, visual test page)
* improve visual test page
  * Support enter-your-own call to lua? (may need wasm Lua...)
  * rely on lua (either at build time or in the browser) instead of hardcoded lua outputs
    * Could have build-time lua be an optional step with cached output json
    * Would need shims for mw stuff
  * Need test cases to be a little more strategic? Maybe show js, nojs, and wiki all together? Not sure we really need a test case for every possible situation. It would be overwhelming.
* Test the export file
  * Figure out what MediaWiki:Gadgets-definition could look like if auto-imported.
  * How will MediaWiki handle "duplicate" pages?
* audit code for readability and obviousness
  * Maybe do a little work to make styling and regional time formats be better supported?
  * Don't force en-us for formatting? Or at least not for getting a timezone short name.
  * What timezone formats are supported as inputs? +8, UTC+8, etc? Note in spec.
* Bugs
  * The server configs are hardcoded, but should live in json.
  * Need to ensure error visibility when given a bad (or likely bad) input
    * Should add an error category tag and pass the input as output. If either start or end is bad, just do this.
* Undefined behavior (document the results)
  * What if someone puts it in a header, in italics text, etc?
  * What actually happens when the language isn't english? Does the i18n date give non-english month names?
* Tooling or advice to help find dates that aren't using the template?
