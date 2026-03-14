# Inline Datetime Gadget

This is a Mediawiki gadget for game wikis with a few game servers in different timezones, where a server's timezone impacts when game content releases.

This gadget will format times and timespans as inline text with a tooltip (accessible on hover or tap) that translates the time to the user's local time. The information is kept minimal for compactness but expansion occurs as needed for precision.

TODO image of a tooltip

## Features
[Full specifications](specifications.md)

**Supported:**
* Multiple servers with distinct time zones
  * Server names and timezones are the only global settings
* Two kinds of datetimes:
  * Single moment across servers (e.g. `04:00 +8`): usually server maintenance
    * In-line text: user's timezone
    * Tooltip: servers' timezones
  * Same server time across servers (e.g. `04:00 server`): usually daily & weekly resets
    * In-line text: the server-relative time
    * Tooltip: when each server observes that time, according to the user's timezone
* Single times or timespans (can mix and match date kinds)
* Specifying a single server for the tooltip instead of showing all of them
* Specifying alternate text to display in-line.
  * This could be used to provide a tooltip on patch notes where you want the displayed text to match the official description of the time.
* Basic defaults to display when Javascript is disabled
* Basic semantic HTML classes to enable custom css
* Auto-deduplicating things like the year or day when it is the same for the whole timespan in the user's time zone.

**Not supported:**
* Languages other than English
* Time formatting other than American
* Events that occur at unrelated times on different servers
  * But: you can use the single server capability to list them separately in-line.
* Live changes to the user's time zone after page load
* No user settings: keeping it simple and avoiding confusion
  * Can't display a specific server's info in-line
  * Can't hide a server's info in the tooltip
    * The tooltip may be unwieldy if displaying a large number of servers
* A server that changes timezone (either due to daylight savings time or permanently on some date)
* Force year to be displayed, even for the current year
  * But: you can use a raw text override
* Disable tooltip (other than by disabling js)

## TODO
* organize files. What's the normal way for a gadget?
* AI directions?
* usage documentation (specs, docs, visual test page)
  * Need to support at least on-wiki and on-web
* improve visual test page
  * Native js/no-js preview?
  * Github auto-build?
  * Test case list?
  * Support select-your-own timezone instead of the browser's default?
  * Support enter-your-own call to lua? (may need wasm Lua...)
* audit code for readability and obviousness
  * Maybe do a little work to make styling and other regions be better supported?
  * Double check on deduping month.
  * What timezone formats are supported as inputs?
  * error visibility when given a bad (or likely bad) input?
  * What actually happens when the language isn't english? Does the i18n date give non-english month names?
  * rename the lua to inline-datetime? Or maybe use a different text that mentions the tooltip? inline-datetime-tooltip? That's kind of long..
* Bugs
  * Tooltip supports click to keep it open. Stays open when clicking again. Is that expected? Maybe close on second click? And/or just make it being open be tap only? Currently tabbable. Is that a good idea?

## Install and Configure

TODO

## Q & A

* What alternatives were considered?
  * [**TZclock** gadget](https://dev.fandom.com/wiki/TZclock): This displays the current time in a specified time zone. It can't display a specific moment in time in the user's timezone. It uses its own implementation of calculating time zones instead of using built in capabilities in Lua or Javascript.
  * [**clock**](https://endfield.wiki.gg/wiki/MediaWiki:Gadgets/clock/main.css) and [**clockScripts**](https://endfield.wiki.gg/wiki/MediaWiki:Gadgets/clockScripts/main.js) gadgets: This shows the current server times and countdowns until resets. It doesn't support inline display or showing specific times or timespans.
  * [**countdown** script](https://dev.fandom.com/wiki/Countdown): This inserts a live countdown into a line of text. When the time is in the past, a different message is shown.
    * Note: For events with a known timespan (e.g. Jan 6-7) starting in the future (e.g. today is Jan 1), it isn't possible to set a single countdown. Instead, the countdown must be set to start counting down until the start, after which it will automatically show a static message like "event is live!". Then if you want to show a countdown until the event ends, you need to edit in a replacement countdown.
  * [**TimezoneConverter** extension](https://www.mediawiki.org/wiki/Extension:TimezoneConverter): not currently approved on wiki.gg, and only shows one time in the user's timezone. But it does accept any time format PHP can make sense of.
* Is this vibe coded slop?
  * Sure: it isn't hand crafted. But there is a specification document and a visual test suite.
* Why doesn't it do X?
  * Features not needed for the initial use case were avoided to reduce unneeded complexity. The initial server already didn't have language or time format localization, so those weren't considered necessary.
  * The gadget is designed to be flexible yet have minimal input surface area. That means as little magic parsing as possible and keeping outputs minimal and predictable.
* Can I contribute?
  * Yes! This is an open source project that you can fork and use as you wish. Currently, this project has only one contributor and once it meets the needs of the intended wiki, it might or might not be maintained. If you have a simple bug fix, I will be happy to test and accept it. If you want to take over as maintainer and have added some features, I'd be happy to add a link from my repository to yours.
  * Any contributions submitted for inclusion in this project are assumed to be under the same license as the project, unless stated otherwise.
