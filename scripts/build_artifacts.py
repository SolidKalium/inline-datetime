#!/usr/bin/env python3

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIST_DIR = ROOT / "dist"
TEST_TEMPLATE = ROOT / "test" / "test.template.html"
TEST_CSS_MARKER = "/* BUILD:INLINE-DATETIME-CSS */"
TEST_JS_MARKER = "/* BUILD:INLINE-DATETIME-JS */"

EXPORT_PAGES = [
    {
        "source": ROOT / "gadget" / "inline-datetime.js",
        "title": "MediaWiki:Gadget-inline-datetime.js",
        "ns": 8,
    },
    {
        "source": ROOT / "gadget" / "inline-datetime.css",
        "title": "MediaWiki:Gadget-inline-datetime.css",
        "ns": 8,
    },
    {
        "source": ROOT / "gadget" / "Module_DateTime.lua",
        "title": "Module:DateTime",
        "ns": 828,
    },
    {
        "source": ROOT / "gadget" / "Template_Dt.wikitext",
        "title": "Template:Dt",
        "ns": 10,
    },
    {
        "source": ROOT / "gadget" / "Template_Dt_doc.wikitext",
        "title": "Template:Dt/doc",
        "ns": 10,
    },
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def indent_block(text: str, prefix: str) -> str:
    return "\n".join(prefix + line if line else "" for line in text.splitlines())


def build_test_page(dist_dir: Path) -> Path:
    template = read_text(TEST_TEMPLATE)
    css = indent_block(read_text(ROOT / "gadget" / "inline-datetime.css").rstrip(), "        ")
    js = indent_block(read_text(ROOT / "gadget" / "inline-datetime.js").rstrip(), "    ")
    test_output = dist_dir / "test.html"

    output = template.replace(TEST_CSS_MARKER, css).replace(TEST_JS_MARKER, js)
    write_text(test_output, output + "\n")
    return test_output


def export_page_xml(page: dict, timestamp: str, revision_id: int) -> str:
    text = read_text(page["source"])
    return (
        "  <page>\n"
        f"    <title>{escape(page['title'])}</title>\n"
        f"    <ns>{page['ns']}</ns>\n"
        f"    <revision>\n"
        f"      <id>{revision_id}</id>\n"
        f"      <timestamp>{timestamp}</timestamp>\n"
        "      <contributor><username>GitHub Build</username></contributor>\n"
        '      <comment>Generated export artifact</comment>\n'
        f"      <text xml:space=\"preserve\">{escape(text)}</text>\n"
        "    </revision>\n"
        "  </page>"
    )


def build_export(dist_dir: Path) -> Path:
    timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    export_output = dist_dir / "mediawiki-export.xml"
    pages = [
        export_page_xml(page, timestamp, revision_id)
        for revision_id, page in enumerate(EXPORT_PAGES, start=1)
    ]
    xml = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<mediawiki xmlns="http://www.mediawiki.org/xml/export-0.11/" version="0.11" xml:lang="en">\n'
        "  <siteinfo>\n"
        "    <sitename>Inline Datetime Gadget</sitename>\n"
        "    <dbname>inline-datetime-gadget</dbname>\n"
        "    <base>https://example.invalid/wiki/Main_Page</base>\n"
        "    <generator>build_artifacts.py</generator>\n"
        "    <case>first-letter</case>\n"
        "    <namespaces>\n"
        '      <namespace key="-2" case="first-letter">Media</namespace>\n'
        '      <namespace key="-1" case="first-letter">Special</namespace>\n'
        '      <namespace key="0" case="first-letter" />\n'
        '      <namespace key="1" case="first-letter">Talk</namespace>\n'
        '      <namespace key="8" case="first-letter">MediaWiki</namespace>\n'
        '      <namespace key="10" case="first-letter">Template</namespace>\n'
        '      <namespace key="828" case="first-letter">Module</namespace>\n'
        "    </namespaces>\n"
        "  </siteinfo>\n"
        f"{chr(10).join(pages)}\n"
        "</mediawiki>\n"
    )
    write_text(export_output, xml)
    return export_output


def main() -> int:
    parser = argparse.ArgumentParser(description="Build demo and MediaWiki export artifacts.")
    parser.add_argument(
        "--dist",
        default=str(DEFAULT_DIST_DIR),
        help="Output directory for generated artifacts.",
    )
    args = parser.parse_args()

    dist_dir = Path(args.dist).resolve()

    test_page = build_test_page(dist_dir)
    export_file = build_export(dist_dir)

    print(f"Built {test_page.relative_to(ROOT)}")
    print(f"Built {export_file.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
