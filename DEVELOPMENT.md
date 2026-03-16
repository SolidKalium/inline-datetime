# Development

This project has a small local build step for generating distributable artifacts without requiring a MediaWiki instance.

Documentation exists in three places:
* [README.md](README.md), [specifications.md](specifications.md), and [DEVELOPMENT.md](DEVELOPMENT.md)
* [Template:InlineDateTime/doc](gadget/Template_InlineDateTime_doc.wikitext)
* The demo page

Testing has three available parts:
* The demo page
* Lua test suite
* Manual integration testing with a prepared docker file

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

## Test cases workflow

* Install luajit
  * mac/linux: `brew install luajit`
* Run test cases: `luajit test/run_lua_tests.lua`
* Test limitations
  * Scribunto blocks many `os.*` and `io.*` functions, but the tests don't enforce this. Scribunto does allow `os.date`, which is currently used.
  * The script uses a few minimal shims to simulate functions provided by MediaWiki.

## MediaWiki import workflow

`dist/mediawiki-export.xml` can be imported with MediaWiki's import tools.

The export intentionally does not include `MediaWiki:Gadgets-definition` because that page is site-specific. After importing, see the [Gadgets-definition and server configuration sections in README.md](README.md#gadgets-definition) for what to add.

The optional `Template:IDT` alias is also not included in the export bundle. If a wiki wants the shorter template name, add it manually.

## GitHub Actions

The workflow at `.github/workflows/build-artifacts.yml` runs the same build script and uploads both generated artifacts.

To enable GitHub Pages: go to `Settings -> Pages` in the repository, then select "GitHub Actions" as the build and deployment source.

*Note: As of March 2026, GitHub has announced that Actions using Node 20 are being deprecated. But they haven't released newer versions for some of the Actions they provide, including configure-pages@v5 and deploy-pages@v4.*

## Local MediaWiki testing

For end-to-end testing in a real wiki environment, this repo includes a minimal `docker-compose.yml` for MediaWiki plus MariaDB.
The MediaWiki container is built from `test/docker/mediawiki.Dockerfile`, which adds Lua 5.1 for Scribunto's `luastandalone` engine.

Start it with:

```bash
docker compose up -d
```

If you change the Dockerfile or want to force a fresh MediaWiki image build, run:

```bash
docker compose build mediawiki
docker compose up -d
```

Then open:

```text
http://localhost:8080
```

Recommended workflow:
1. Run `python3 scripts/build_artifacts.py` so the current export file exists in `dist/`.
2. Start the stack with `docker compose up -d`.
   * After first startup or after enabling/changing extension config in `LocalSettings.php`, run:

   ```bash
   docker compose exec mediawiki php maintenance/run.php update
   ```

3. Login with credentials admin / adminpassword. *The config does not expose the container to the internet and you shouldn't use these credentials if you do.*
4. Import the generated export into the running wiki using one of these methods:
   * In `Special:Import`, upload the local `dist/mediawiki-export.xml` file from your machine. Use any import prefix (e.g. "imported") for the edit logs.
   * Or import from inside the container with:

   ```bash
   docker compose exec mediawiki php maintenance/run.php importDump /imports/mediawiki-export.xml
   ```

   * Note that these will clobber any existing pages, though undo will be available in the version history. The import will not work correctly until Scribunto's install maintenance has run.

5. Update `MediaWiki:Gadgets-definition` to load `MediaWiki:Gadget-inline-datetime.js` and `MediaWiki:Gadget-inline-datetime.css`.
6. Optionally add `Template:IDT` manually if you want the short alias.
7. Create a sandbox page with representative template calls and verify the rendered output, tooltip behavior, and fallback behavior.

Notes:
* This is meant for manual integration testing, not full automated browser E2E.
* `test/docker/LocalSettings.php` is committed as a local test-only configuration for this Docker setup. It should not be reused for production or public deployment.
* The generated `dist/` directory is mounted read-only into the MediaWiki container at `/imports`.
* `test/docker/LocalSettings.php` is mounted read-only into the MediaWiki container as `/var/www/html/LocalSettings.php`.
* The `mediawiki:1.43` image doesn't include Scribunto's bundled standalone Lua binary, so we install system lua5.1 and we have `test/docker/LocalSettings.php` explicitly point Scribunto at `/usr/bin/lua5.1`.
* Uploaded wiki files live in a named Docker volume, so restarting the stack does not wipe images.
