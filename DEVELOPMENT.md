# Development

This project has a small local build step for generating distributable artifacts without requiring a MediaWiki instance.

## Build artifacts

Run:

```bash
python3 scripts/build_artifacts.py
```

This generates:

* `dist/index.html`
  * A self-contained demo page built from `test/test.template.html`
  * Embeds the current `gadget/inline-datetime.js` and `gadget/inline-datetime.css`
* `dist/mediawiki-export.xml`
  * A MediaWiki XML export bundle containing:
    * `MediaWiki:Gadget-inline-datetime-config.js`
    * `MediaWiki:Gadget-inline-datetime.js`
    * `MediaWiki:Gadget-inline-datetime.css`
    * `Module:InlineDateTime`
    * `Template:InlineDateTime`
    * `Template:InlineDateTime/doc`

`dist/` is ignored in git because these files are generated artifacts.

## Test page workflow

Edit `test/test.template.html` if you want to change the demo page structure or add more examples.

Do not manually edit `dist/index.html`. Rebuild it from the template instead.

## MediaWiki import workflow

`dist/mediawiki-export.xml` can be imported with MediaWiki's import tools.

The export intentionally does not include `MediaWiki:Gadgets-definition` because that page is site-specific. After importing, see the [Gadgets-definition and server configuration sections in README.md](README.md#gadgets-definition) for what to add.

The optional `Template:IDT` alias is also not included in the export bundle. If a wiki wants the shorter template name, add it manually.

## GitHub Actions

The workflow at `.github/workflows/build-artifacts.yml` runs the same build script and uploads both generated artifacts.

To enable GitHub Pages: go to `Settings -> Pages` in the repository, then select "GitHub Actions" as the build and deployment source.

*Note: As of March 2026, GitHub has announced that Actions using Node 20 are being deprecated. But they haven't released newer versions for some of the Actions they provide, including configure-pages@v5 and deploy-pages@v4.*
