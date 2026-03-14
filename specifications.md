# Specifications

## Design-level
* Keep inputs simple
  * Complex inputs will prevent the gadget from being used
  * Inputs should be flexible enough to not require inhuman consistency, but should still be limited enough that there aren't weird edge cases.
* Focus on a core use case: a tooltip for times and timespans that translates time zones
  * Let other templates wrap the script if they need other features like:
    * Insert the date in a template with text, possibly with a countdown added dynamically
    * Parse a raw unformatted changelog date description and automatically create the tooltip
  * We only support single-moment and server's-time-zone times. If something happens at unrelated times on different servers, it shouldn't be hidden in a tooltip unless it is called out in a clear way.
* Keep output text simple
  * Long descriptions are harder to make sense of, especially for timespans
  * This doesn't mean a simple transformation to make the output text
  * We can move certain time elements to the end if they are the same for the start and end. E.g. only list the timezone once at the end if both times have the same timezone.
  * If we don't hide part of the time (e.g. the year) for the start time, it shouldn't be hidden for the end time.
* Keep output style easy to read
  * The text should be easy to scan quickly
  * Things like timezone are valuable and must be part of the output, but they aren't the core info being communicated, so they should have lower emphasis.
  * Times should have the same styling whether in-line or in the tooltip.
  * Styles should work in both light and dark modes.
  * Use nowrap to keep the full start and full end times on a single line. Hopefully they are both on the same line as each other, but they may need to be split on narrow displays.
* Must look ok when Javascript is disabled

## Parameters
Example: `{{dt|start=YYYY-MM-DD HH:MM|end=YYYY-MM-DD HH:MM}}`

* `start` (or `1`) and `end` (or `2`): start and end times. End time is optional.
  * Offset is part of the datetime string.
    * An absolute time should have a UTC offset specified at the end like `+8` or `-5`
    * If no UTC offset is given or the string ends with `server`, then the the time is assumed to be in each server's local time.
* `server`: =asia or server=americas filters tooltip to one server. Omit for both.
* `raw`: preserves the original text inline; JS still builds tooltips from start/end values.

* No separate tz= parameter needed for common cases, but could be added later as a shorthand to apply a default offset to values that don't have one (useful for Context 1 / dev notes where offset is stated once at the end).


TODO

## Style considerations
* Decided each server should be a single line of "start-end" instead of having separate sections for start and end.
* Decided to leave AM/PM on the baseline, but it could potentially be elevated and shrunk.
* Considered de-emphasizing the minutes, but it looks terrible when done naively. Maybe `:00` could be hidden, but keeping it is probably fine.


## AI's summary
Server definitions

Asia server: UTC+8, fixed, no DST
Americas/Europe server: UTC-5, fixed, no DST (EST year-round regardless of US DST)
Server offsets are hardcoded. If they ever change, the code needs updating and past dates before the change would need consideration in a future refactor.
Server labels in tooltips: "Asia" and "Americas" (shortened from full names)

Timezone types

"server" = same wall-clock time for each server independently. Different real-world moments.
Explicit offset (+8, -5, etc.) = absolute moment, same real-world instant for everyone.
Start and end of a range can have different types (e.g., absolute start after maintenance, server-relative end at daily reset).

Template API

`{{dt|start=YYYY-MM-DD HH:MM|end=YYYY-MM-DD HH:MM}}`
Offset baked into the datetime string: 2026-03-12 06:00 +8 means absolute. No offset means server time.
No separate tz= parameter needed for common cases, but could be added later as a shorthand to apply a default offset to values that don't have one (useful for Context 1 / dev notes where offset is stated once at the end).
server=asia or server=americas filters tooltip to one server. Omit for both.
raw= preserves the original text inline; JS still builds tooltips from start/end values.
Positional args supported: start or 1, end or 2.

Inline display behavior

Absolute times: shown in the reader's browser local timezone with their TZ abbreviation (e.g., "EDT").
Server times: shown as the wall-clock value with "(server)" label.
Single point: "Mar 29, 12:00 PM (server)" or "Mar 11, 6:00 PM EDT"
Range, same day in display TZ: date shown once, times collapsed. "Mar 11, 6:00 PM – 12:00 AM EDT"
Range, different days: both dates shown. "Mar 11, 6:00 PM – Mar 12, 12:00 AM EDT"
TZ label deduplication: when both endpoints share the same label, it appears once at the end of the range. When they differ (mixed absolute/server), each endpoint gets its own.
raw= mode: inline text is untouched. JS only adds tooltip.

Tooltip behavior

Always one line per server (not separate Start/End sections).
Each line shows the full range (or single point) from that server's perspective.
For server-time inline: tooltip shows reader's local time per server.
For absolute-time inline: tooltip shows each server's wall-clock time.
Same-day collapsing and TZ deduplication apply within tooltip lines too.
server= parameter filters which server lines appear.

Year display

Hidden if it matches the current year.
Shown if it doesn't match the current year.
If start and end are in different years (in their display timezone), year is forced on both endpoints even if one matches the current year. Prevents ambiguity like "Dec 20, 2025 – Jan 10" where Jan 10 could be misread as 2025.

Text styling

AM/PM: small caps, 0.9em
TZ label (both user abbreviation and "(server)"): 0.65 opacity, 0.9em, nowrap
Same styling in both inline and tooltip (tooltip uses dt-tt-* prefix classes)
No special treatment for minutes. :00 and :59 styled identically.
Dashed underline on processed elements as hover/tap affordance, scoped to .dt-handled

Progressive enhancement / no-JS

Template (Lua) emits a <span class="dt-inline"> with data attributes and plain fallback text inside.
JS finds unhandled .dt-inline elements, builds styled inline display and tooltip, adds .dt-handled class.
.dt-handled triggers the dashed underline via CSS. No visual affordance without JS.
No-JS users see the fallback text with offset or "(server time)" — same quality as the wiki's current plain-text dates.
Tooltip only exists after JS runs.
tabindex="0" added by JS for keyboard/touch accessibility.

Touch/mobile

@media (hover: none): dotted underline instead of dashed, outline suppressed.
Tooltip shown via :focus (tap triggers focus on tabindex element).
Tooltip uses nowrap (no max-width constraint). Long lines are accepted since we're keeping content tight already.

Architecture

Lua module (Module:DateTime): parses editor input, emits structured HTML with data attributes, generates fallback text.
Template (Template:Dt): thin #invoke wrapper.
JS gadget: all display logic, timezone detection, tooltip construction. Runs on DOMContentLoaded and on mw.hook('wikipage.content') for dynamic content.
CSS gadget: styling for inline, tooltip, and touch. Uses CSS custom properties --dt-tooltip-bg and --dt-tooltip-fg for theme compatibility.
Existing wiki infrastructure is not touched. TZclock, countdown template, and clock gadgets remain independent.

Deferred / out of scope

Context 1 (dev patch notes): template wrapping with raw= is supported but free-form text parsing is deferred. A future dt-raw wrapper template could parse the dev's format automatically.
Per-server distinct times (different absolute moments per server): not currently in the template API. Could be added as start-asia= / start-americas= or just two separate {{dt}} calls with server= filters.
i18n / date format preferences: dates are US format (Month Day, Year). Documented as such. Future enhancement if needed.
tz= shorthand parameter for applying a default offset to both endpoints.
The TimezoneConverter MediaWiki extension is not in wiki.gg's catalog. Could be requested but is not required for this approach.
No-JS preview mode on the wiki: documented recommendation to disable JS in devtools rather than building a toggle.
