# Specifications

For features included and not included, see the main [README.md](README.md#features)

## Parameters
Format: `{{dt|start=YYYY-MM-DD HH:MM|end=YYYY-MM-DD HH:MM OFFSET}}`

All parameters are optional except `start`/`1`.

* `start`/`1` and `end`/`2`: start and end times
  * Kinds of time (input)
    * Absolute time: a single moment affecting all servers simultaneously
      * A UTC offset like "+8" or "-5" is specified at the end of the string
    * Server time: each server is affected when this is the server's local time
      * No offset is specified *or* the offset is "server"
* `server`: the tooltip will only list the specified server. Omit for all servers to be shown.
* `raw`: text to show inline instead of the auto-formatted date time. JS will still build a tooltip from the start/end values.

## Output

There are two main parts of the display: the inline text and the tooltip.

TODO example tooltip image (same as README)

### Time formatting

Time and timespan formatting is the same whether inline or in the tooltip.

* Kinds of time (output)
  * Visitor's time: displayed in the browser's timezone (e.g. "EDT")
  * Specific server time: displayed in the server's timezone (e.g. "UTC+8")
  * Generic server time: displayed with a timezone of "(server)"
* Timezone deduplication
  * When start and end are shown in the same timezone, it's only labelled at the end
  * When they differ, each endpoint has a timezone label
    * This could be one absolute time and one server time
    * Or the visitor's timezone changes abbreviations (such as due to DST)
* Current year hiding
  * When the time (or full timespan) is in the same year (in the timezone it is displayed), then the year is hidden to save space.
* Date format examples:
  * `start` only: "Mar 29, 12:00 PM (server)" or "Mar 11, 6:00 PM EDT"
  * `start` and `end` share a timezone and date: "Mar 11, 6:00 PM – 12:00 AM EDT"
  * `start` and `end` share a timezone but not date: "Mar 11, 6:00 PM – Mar 12, 12:00 AM EDT"

### Inline display behavior
* The text is a time (or timespan) description that applies to all servers.
  * Absolute time: the visitor's local time
  * Server time: the generic server time
* Inherits styling applied around it (e.g. bold or italics)
  * If Javascript is enabled, affordances like a dashed underline are displayed to indicate there is a tooltip available.
* If `raw` is specified, it is the inline text. `start` and `end` will only affect the tooltip.
* If Javascript is disabled, the fallback value is shown. This is a non-localized description that applies to all servers. It uses the timezone given to the template.

### Tooltip behavior
* Each server gets its own line showing the time (or timespan) in a server-specific manner.
  * Absolute time: the server's time when it is affected
  * Server time: the visitor's local time when the server is affected
* If `server` was specified, then only that server is shown in the tooltip.
* If Javascript is disabled, the tooltip isn't available.

## Architecture
* Lua module (Module:DateTime)
  * parses input
  * generates fallback text
  * emits structured HTML with data attributes
* Template (Template:Dt)
  * thin #invoke wrapper
* JS gadget
  * display logic
  * user timezone detection
  * tooltip construction
  * Runs on DOMContentLoaded and on mw.hook('wikipage.content') for dynamic content
* CSS gadget
  * styling for inline, tooltip, and touch
  * Uses CSS custom properties --dt-tooltip-bg and --dt-tooltip-fg for theme compatibility
* Does not rely on other gadgets or extensions

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

## Considerations

### Style considerations
* Decided each server should be a single line of "start-end" instead of having separate sections for start and end.
* Decided to leave AM/PM on the baseline, but it could potentially be elevated and shrunk.
* Considered de-emphasizing the minutes, but it looks terrible when done naively. Maybe `:00` could be hidden, but keeping it is probably fine.

### API considerations
* Decided to keep the timezone in the same string as the input datetime. This ensures the timezone is specified directly next to the datetime. It avoids dealing with a global `tz` and specific `start-tz` and `end-tz` parameters that might surprise an editor.
