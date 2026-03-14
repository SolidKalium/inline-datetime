#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DIST_DIR = ROOT / "dist"
TEST_TEMPLATE = ROOT / "test" / "test.template.html"
TEST_CASES = ROOT / "test" / "test-cases.json"
TEST_CSS_MARKER = "/* BUILD:INLINE-DATETIME-CSS */"
TEST_JS_MARKER = "/* BUILD:INLINE-DATETIME-JS */"
TEST_CASES_INTERACTIVE_MARKER = "<!-- BUILD:TEST-CASES-INTERACTIVE -->"
TEST_CASES_FALLBACK_MARKER = "<!-- BUILD:TEST-CASES-FALLBACK -->"

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
        "source": ROOT / "gadget" / "Module_InlineDateTime.lua",
        "title": "Module:InlineDateTime",
        "ns": 828,
    },
    {
        "source": ROOT / "gadget" / "Template_InlineDateTime.wikitext",
        "title": "Template:InlineDateTime",
        "ns": 10,
    },
    {
        "source": ROOT / "gadget" / "Template_InlineDateTime_doc.wikitext",
        "title": "Template:InlineDateTime/doc",
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


def html_escape(text: str) -> str:
    return escape(text, {'"': "&quot;"})


def render_case(case: dict, prefix: str, interactive: bool) -> str:
    lines = []

    title = case.get("title")
    if title:
        lines.append(f"{prefix}<h3>{html_escape(title)}</h3>")

    lines.append(f"{prefix}<div class=\"example\">")

    note = case.get("note")
    if note:
        lines.append(f"{prefix}    <p class=\"note\">{html_escape(note)}</p>")

    description_before = case.get("description_before", "")
    description_after = case.get("description_after", ".")
    fallback = html_escape(case["fallback"])

    if interactive:
        attrs = " ".join(
            f'{name}="{html_escape(value)}"'
            for name, value in case.get("attrs", {}).items()
        )
        span_open = f"<span class=\"dt-inline\" {attrs}>"
        lines.append(
            f"{prefix}    <p>{html_escape(description_before)}"
            f"{' ' if description_before else ''}{span_open}{fallback}</span>{html_escape(description_after)}</p>"
        )
    else:
        lines.append(
            f"{prefix}    <p>{html_escape(description_before)}"
            f"{' ' if description_before else ''}<span>{fallback}</span>{html_escape(description_after)}</p>"
        )

    code = case.get("code")
    if code:
        lines.append(f"{prefix}    <p class=\"note\"><code>{html_escape(code)}</code></p>")

    lines.append(f"{prefix}</div>")
    return "\n".join(lines)


def render_test_cases(interactive: bool) -> str:
    data = json.loads(read_text(TEST_CASES))
    lines = []

    for section in data["sections"]:
        lines.append(f"<h2>{html_escape(section['title'])}</h2>")
        wrapper_class = section.get("wrapper_class")
        wrapper_style = section.get("wrapper_style")
        prefix = ""

        if wrapper_class:
            attrs = [f'class="{html_escape(wrapper_class)}"']
            if wrapper_style:
                attrs.append(f'style="{html_escape(wrapper_style)}"')
            lines.append(f"<div {' '.join(attrs)}>")
            prefix = "    "

        for case in section["cases"]:
            lines.append(render_case(case, prefix, interactive))

        if wrapper_class:
            lines.append("</div>")

        lines.append("")

    return "\n".join(lines).rstrip()


def build_test_page(dist_dir: Path) -> Path:
    template = read_text(TEST_TEMPLATE)
    css = indent_block(read_text(ROOT / "gadget" / "inline-datetime.css").rstrip(), "        ")
    js = indent_block(read_text(ROOT / "gadget" / "inline-datetime.js").rstrip(), "    ")
    interactive_cases = render_test_cases(interactive=True)
    fallback_cases = render_test_cases(interactive=False)
    test_output = dist_dir / "index.html"
    legacy_output = dist_dir / "test.html"

    output = (
        template
        .replace(TEST_CSS_MARKER, css)
        .replace(TEST_JS_MARKER, js)
        .replace(TEST_CASES_INTERACTIVE_MARKER, interactive_cases)
        .replace(TEST_CASES_FALLBACK_MARKER, fallback_cases)
    )
    write_text(test_output, output + "\n")
    if legacy_output.exists():
        legacy_output.unlink()
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
