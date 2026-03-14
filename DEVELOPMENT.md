# Development

This project has a small local build step for generating distributable artifacts without requiring a MediaWiki instance.

## Build artifacts

Run:

```bash
python3 scripts/build_artifacts.py
```

This generates:

* `dist/test.html`
  * A self-contained demo page built from `test/test.template.html`
  * Embeds the current `gadget/inline-datetime.js` and `gadget/inline-datetime.css`
* `dist/mediawiki-export.xml`
  * A MediaWiki XML export bundle containing:
    * `MediaWiki:Gadget-inline-datetime.js`
    * `MediaWiki:Gadget-inline-datetime.css`
    * `Module:DateTime`
    * `Template:Dt`
    * `Template:Dt/doc`

`dist/` is ignored in git because these files are generated artifacts.

## Test page workflow

Edit `test/test.template.html` if you want to change the demo page structure or add more examples.

Do not manually edit `dist/test.html`. Rebuild it from the template instead.

## MediaWiki import workflow

`dist/mediawiki-export.xml` can be imported with MediaWiki's import tools.

The export intentionally does not include `MediaWiki:Gadgets-definition` because that page is site-specific. After importing the pages, update your target wiki's gadget definition/configuration to load the JS and CSS pages.

## GitHub Actions

The workflow at `.github/workflows/build-artifacts.yml` runs the same build script and uploads both generated artifacts.
