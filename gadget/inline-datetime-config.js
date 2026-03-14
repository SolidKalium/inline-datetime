/**
 * InlineDateTime gadget configuration
 * MediaWiki:Gadget-inline-datetime-config.js
 *
 * Edit this page to configure the gadget for this wiki.
 * This file is loaded before the main gadget script.
 *
 * servers: list of game servers, in display order.
 *   key      - internal identifier; matches the |server= template parameter
 *   label    - display name shown in tooltips
 *   offsetMin - fixed UTC offset in minutes (no DST support)
 *               e.g. UTC+8 = 480, UTC-5 = -300
 */
window.inlineDatetimeConfig = {
    servers: [
        { key: 'asia',     label: 'Asia',     offsetMin:  480 },  // UTC+8
        { key: 'americas', label: 'Americas', offsetMin: -300 }   // UTC-5
    ]
};
