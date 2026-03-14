# Specifications

For features included and not included, see the main [README.md](README.md#features)

## Design Requirements
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
  * This doesn't necessarily mean a simple transformation to make the output text
  * We can move certain time elements to the end if they are the same for the start and end. E.g. only list the timezone once at the end if both times have the same timezone.
  * If we don't hide part of the time (e.g. the year) for the start time, it shouldn't be hidden for the end time.
* Keep output style easy to read
  * The text should be easy to scan quickly
  * Things like timezone are valuable and must be part of the output, but they aren't the core info being communicated, so they should have lower emphasis.
  * Times should have the same styling whether in-line or in the tooltip.
  * Styles should work in both light and dark modes.
  * Use nowrap to keep the full start and full end times each on a single line. Hopefully they are both on the same line, but they may need to be split on narrow displays.
    * Long lines are accepted since we're already keeping content tight.
* Must look ok when Javascript is disabled

## Parameters
Example: `{{dt|start=YYYY-MM-DD HH:MM|end=YYYY-MM-DD HH:MM}}`

All parameters are optional except `start`/`1`.

* `start` (or `1`) and `end` (or `2`): start and end times
  * Offset is part of the datetime string.
    * An absolute time should have a UTC offset specified at the end like `+8` or `-5`
    * If no UTC offset is given or the string ends with `server`, then the the time is assumed to be in each server's local time.
* `server`: the tooltip will only list the specified server. Omit for all servers to be shown.
* `raw`: text to show inline instead of the auto-formatted date time. JS will still build a tooltip from the start/end values.

## Considerations

### Style considerations
* Decided each server should be a single line of "start-end" instead of having separate sections for start and end.
* Decided to leave AM/PM on the baseline, but it could potentially be elevated and shrunk.
* Considered de-emphasizing the minutes, but it looks terrible when done naively. Maybe `:00` could be hidden, but keeping it is probably fine.

### API considerations
* Decided to keep the timezone in the same string as the input datetime. This ensures the timezone is specified directly next to the datetime. It avoids dealing with a global `tz` and specific `start-tz` and `end-tz` parameters that might surprise an editor.


## AI's summary

### Inline display behavior

* Absolute times: shown in the reader's browser local timezone with their TZ abbreviation (e.g., "EDT").
* Server times: shown as the wall-clock value with "(server)" label.
* Single point: "Mar 29, 12:00 PM (server)" or "Mar 11, 6:00 PM EDT"
* Range, same day in display TZ: date shown once, times collapsed. "Mar 11, 6:00 PM – 12:00 AM EDT"
* Range, different days: both dates shown. "Mar 11, 6:00 PM – Mar 12, 12:00 AM EDT"
* TZ label deduplication: when both endpoints share the same label, it appears once at the end of the range. When they differ (mixed absolute/server), each endpoint gets its own.
* raw= mode: inline text is untouched. JS only adds tooltip.

### Tooltip behavior

* Always one line per server (not separate Start/End sections).
* Each line shows the full range (or single point) from that server's perspective.
* For server-time inline: tooltip shows reader's local time per server.
* For absolute-time inline: tooltip shows each server's wall-clock time.
* Same-day collapsing and TZ deduplication apply within tooltip lines too.
* server= parameter filters which server lines appear.

### Architecture

* Lua module (Module:DateTime): parses editor input, emits structured HTML with data attributes, generates fallback text.
* Template (Template:Dt): thin #invoke wrapper.
* JS gadget: all display logic, timezone detection, tooltip construction. Runs on DOMContentLoaded and on mw.hook('wikipage.content') for dynamic content.
* CSS gadget: styling for inline, tooltip, and touch. Uses CSS custom properties --dt-tooltip-bg and --dt-tooltip-fg for theme compatibility.
* Existing wiki infrastructure is not touched. TZclock, countdown template, and clock gadgets remain independent.
