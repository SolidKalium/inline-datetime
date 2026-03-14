/**
 * DateTime inline converter
 *
 * Data attributes (emitted by Module:DateTime / Template:Dt):
 *   data-dt-start       ISO-ish datetime (with or without offset)
 *   data-dt-start-tz    "server" or offset like "+8", "-5"
 *   data-dt-end          (optional)
 *   data-dt-end-tz       (optional)
 *   data-dt-server       (optional) "asia" or "americas" to filter tooltip
 *   data-dt-raw          (optional) if present, don't overwrite inline text
 *
 * Server definitions (fixed offsets, no DST):
 *   Asia:              UTC+8
 *   Americas / Europe: UTC-5
 */
;(function () {
    'use strict';

    var SERVERS = {
        asia:     { label: 'Asia',      offsetMin: 8 * 60 },
        americas: { label: 'Americas',  offsetMin: -5 * 60 }
    };

    var HANDLED_CLASS = 'dt-handled';
    var SERVER_LABEL = '(server)'; // inline label for server-relative times

    // --- Utility functions ---

    function parseOffsetMinutes(s) {
        if (!s || s === 'server') return NaN;
        var m = s.match(/^([+-])(\d{1,2}):?(\d{2})?$/);
        if (!m) return NaN;
        var sign = m[1] === '-' ? -1 : 1;
        var hours = parseInt(m[2], 10);
        var mins = m[3] ? parseInt(m[3], 10) : 0;
        return sign * (hours * 60 + mins);
    }

    function parseToUTCms(isoStr, tzStr) {
        if (!isoStr) return null;
        if (/[+-]\d{2}:\d{2}$/.test(isoStr)) {
            return new Date(isoStr).getTime();
        }
        var offMin = parseOffsetMinutes(tzStr);
        if (!isNaN(offMin)) {
            return new Date(isoStr + 'Z').getTime() - offMin * 60000;
        }
        return new Date(isoStr + 'Z').getTime();
    }

    function formatInOffset(utcMs, offsetMin, forceYear) {
        var d = new Date(utcMs + offsetMin * 60000);
        var months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        var month = months[d.getUTCMonth()];
        var day = d.getUTCDate();
        var year = d.getUTCFullYear();
        var h = d.getUTCHours();
        var m = d.getUTCMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        var h12 = h % 12 || 12;
        var timeCore = h12 + ':' + (m < 10 ? '0' : '') + m;

        var currentYear = new Date().getFullYear();
        var showYear = forceYear || (year !== currentYear);
        var dateStr = month + ' ' + day;
        if (showYear) {
            dateStr += ', ' + year;
        }

        return {
            date: dateStr,
            timeCore: timeCore,
            ampm: ampm,
            year: year,
            monthIdx: d.getUTCMonth(),
            day: day,
            full: dateStr + ', ' + timeCore + ' ' + ampm
        };
    }

    function needForceYear(startUtcMs, startOff, endUtcMs, endOff) {
        if (endUtcMs === null) return false;
        var sy = new Date(startUtcMs + startOff * 60000).getUTCFullYear();
        var ey = new Date(endUtcMs + endOff * 60000).getUTCFullYear();
        return sy !== ey;
    }

    function getUserTZ() {
        var now = new Date();
        var offsetMin = -now.getTimezoneOffset();
        var abbr = '';
        try {
            var parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
                .formatToParts(now);
            for (var i = 0; i < parts.length; i++) {
                if (parts[i].type === 'timeZoneName') {
                    abbr = parts[i].value;
                    break;
                }
            }
        } catch (e) {
            var sign = offsetMin >= 0 ? '+' : '-';
            var absOff = Math.abs(offsetMin);
            abbr = 'UTC' + sign + Math.floor(absOff / 60);
            if (absOff % 60) abbr += ':' + (absOff % 60 < 10 ? '0' : '') + (absOff % 60);
        }
        return { offsetMin: offsetMin, abbr: abbr };
    }

    function formatOffset(offsetMin) {
        var sign = offsetMin >= 0 ? '+' : '-';
        var abs = Math.abs(offsetMin);
        var h = Math.floor(abs / 60);
        var m = abs % 60;
        var s = 'UTC' + sign + h;
        if (m) s += ':' + (m < 10 ? '0' : '') + m;
        return s;
    }

    function sameDay(f1, f2) {
        return f1.year === f2.year && f1.monthIdx === f2.monthIdx && f1.day === f2.day;
    }

    /**
     * Get the inline TZ label for an endpoint.
     * Server time: "(server)"
     * Absolute: user's TZ abbr like "EDT"
     */
    function inlineTzLabel(tzStr, userTZ) {
        return (tzStr === 'server') ? SERVER_LABEL : userTZ.abbr;
    }

    // --- DOM building helpers ---

    function buildStyledTime(fmt, prefix) {
        var frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode(fmt.timeCore + '\u00A0'));
        var ampmSpan = document.createElement('span');
        ampmSpan.className = prefix + 'ampm';
        ampmSpan.textContent = fmt.ampm;
        frag.appendChild(ampmSpan);
        return frag;
    }

    function buildTzNode(tzAbbr, prefix) {
        var frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode('\u00A0'));
        var tzSpan = document.createElement('span');
        tzSpan.className = prefix + 'tz';
        tzSpan.textContent = tzAbbr;
        frag.appendChild(tzSpan);
        return frag;
    }

    function buildDateTimeNodes(fmt, prefix) {
        var frag = document.createDocumentFragment();
        frag.appendChild(document.createTextNode(fmt.date + ', '));
        frag.appendChild(buildStyledTime(fmt, prefix));
        return frag;
    }

    function buildTimeOnlyNodes(fmt, prefix) {
        return buildStyledTime(fmt, prefix);
    }

    /**
     * Build full inline display.
     *
     * TZ placement rules:
     * - Single point: TZ after the time.
     * - Range, both same TZ label: TZ once at the very end.
     * - Range, different TZ labels: each endpoint gets its own TZ label.
     */
    function buildInlineDisplay(startUtcMs, startTz, endUtcMs, endTz, userTZ) {
        var frag = document.createDocumentFragment();
        var startIsServer = (startTz === 'server');
        var endIsServer = endTz ? (endTz === 'server') : null;
        var startOff = startIsServer ? 0 : userTZ.offsetMin;
        var endOff = (endUtcMs !== null) ? (endIsServer ? 0 : userTZ.offsetMin) : 0;
        var forceYear = needForceYear(startUtcMs, startOff, endUtcMs, endOff);

        var startFmt = formatInOffset(startUtcMs, startOff, forceYear);
        var startLabel = inlineTzLabel(startTz, userTZ);

        // Single point
        if (endUtcMs === null) {
            frag.appendChild(buildDateTimeNodes(startFmt, 'dt-'));
            frag.appendChild(buildTzNode(startLabel, 'dt-'));
            return frag;
        }

        var endFmt = formatInOffset(endUtcMs, endOff, forceYear);
        var endLabel = inlineTzLabel(endTz, userTZ);
        var sameTzLabel = (startLabel === endLabel);

        // Start datetime
        frag.appendChild(buildDateTimeNodes(startFmt, 'dt-'));
        // If different TZ labels, put start's label here
        if (!sameTzLabel) {
            frag.appendChild(buildTzNode(startLabel, 'dt-'));
        }

        // Separator
        frag.appendChild(document.createTextNode(' – '));

        // End datetime (collapsed if same day)
        if (sameDay(startFmt, endFmt)) {
            frag.appendChild(buildTimeOnlyNodes(endFmt, 'dt-'));
        } else {
            frag.appendChild(buildDateTimeNodes(endFmt, 'dt-'));
        }

        // If different TZ labels, put end's label here; if same, put shared label here
        frag.appendChild(buildTzNode(endLabel, 'dt-'));

        return frag;
    }

    // --- Tooltip construction ---

    function buildTooltipLines(startUtcMs, startTz, endUtcMs, endTz, serverFilter, userTZ) {
        var serverKeys = Object.keys(SERVERS);
        var lines = [];
        var startIsServer = (startTz === 'server');
        var endIsServer = endTz ? (endTz === 'server') : null;

        for (var i = 0; i < serverKeys.length; i++) {
            var key = serverKeys[i];
            if (serverFilter && serverFilter !== key) continue;
            var srv = SERVERS[key];

            // Compute start in display tz
            var startDisplayUtc, startOff, startTzLabel;
            if (startIsServer) {
                startDisplayUtc = startUtcMs - srv.offsetMin * 60000;
                startOff = userTZ.offsetMin;
                startTzLabel = userTZ.abbr;
            } else {
                startDisplayUtc = startUtcMs;
                startOff = srv.offsetMin;
                startTzLabel = formatOffset(srv.offsetMin);
            }

            // Single point
            if (endUtcMs === null) {
                var sf = formatInOffset(startDisplayUtc, startOff, false);
                var singleFrag = document.createDocumentFragment();
                singleFrag.appendChild(buildDateTimeNodes(sf, 'dt-tt-'));
                singleFrag.appendChild(buildTzNode(startTzLabel, 'dt-tt-'));
                lines.push({ label: srv.label, frag: singleFrag });
                continue;
            }

            // Compute end in display tz
            var endDisplayUtc, endOff, endTzLabel;
            if (endIsServer) {
                endDisplayUtc = endUtcMs - srv.offsetMin * 60000;
                endOff = userTZ.offsetMin;
                endTzLabel = userTZ.abbr;
            } else {
                endDisplayUtc = endUtcMs;
                endOff = srv.offsetMin;
                endTzLabel = formatOffset(srv.offsetMin);
            }

            var forceYear = needForceYear(startDisplayUtc, startOff, endDisplayUtc, endOff);
            var sf2 = formatInOffset(startDisplayUtc, startOff, forceYear);
            var ef = formatInOffset(endDisplayUtc, endOff, forceYear);
            var sameTz = (startTzLabel === endTzLabel);

            var rangeFrag = document.createDocumentFragment();

            // Start
            rangeFrag.appendChild(buildDateTimeNodes(sf2, 'dt-tt-'));
            if (!sameTz) {
                rangeFrag.appendChild(buildTzNode(startTzLabel, 'dt-tt-'));
            }

            rangeFrag.appendChild(document.createTextNode(' – '));

            // End (collapsed if same day)
            if (sameDay(sf2, ef)) {
                rangeFrag.appendChild(buildTimeOnlyNodes(ef, 'dt-tt-'));
            } else {
                rangeFrag.appendChild(buildDateTimeNodes(ef, 'dt-tt-'));
            }

            // TZ at end (shared or end-specific)
            rangeFrag.appendChild(buildTzNode(endTzLabel, 'dt-tt-'));

            lines.push({ label: srv.label, frag: rangeFrag });
        }

        return lines;
    }

    // --- Tooltip DOM ---

    function createTooltipEl(lines) {
        if (!lines.length) return null;
        var container = document.createElement('span');
        container.className = 'dt-tooltip';

        for (var i = 0; i < lines.length; i++) {
            var row = document.createElement('span');
            row.className = 'dt-tooltip-row';

            if (lines[i].label) {
                var label = document.createElement('span');
                label.className = 'dt-tooltip-label';
                label.textContent = lines[i].label + ': ';
                row.appendChild(label);
            }

            if (lines[i].frag) {
                var val = document.createElement('span');
                val.className = 'dt-tooltip-value';
                val.appendChild(lines[i].frag);
                row.appendChild(val);
            } else if (lines[i].text) {
                var val2 = document.createElement('span');
                val2.className = 'dt-tooltip-value';
                val2.textContent = lines[i].text;
                row.appendChild(val2);
            }

            container.appendChild(row);
        }

        return container;
    }

    // --- Main processing ---

    function processElement(el) {
        if (el.classList.contains(HANDLED_CLASS)) return;
        if (!el.hasAttribute('data-dt-start')) {
            el.classList.add(HANDLED_CLASS);
            return;
        }

        var userTZ = getUserTZ();

        var startISO = el.getAttribute('data-dt-start');
        var startTzStr = el.getAttribute('data-dt-start-tz') || 'server';
        var endISO = el.getAttribute('data-dt-end');
        var endTzStr = el.getAttribute('data-dt-end-tz') || 'server';
        var serverFilter = el.getAttribute('data-dt-server') || null;
        var hasRaw = el.hasAttribute('data-dt-raw');

        var startUtcMs = parseToUTCms(startISO, startTzStr);
        var endUtcMs = parseToUTCms(endISO, endTzStr);

        if (startUtcMs !== null && !hasRaw) {
            while (el.firstChild) el.removeChild(el.firstChild);
            el.appendChild(buildInlineDisplay(
                startUtcMs, startTzStr, endUtcMs, endTzStr, userTZ
            ));
        }

        var tooltipLines = buildTooltipLines(
            startUtcMs, startTzStr, endUtcMs, endTzStr, serverFilter, userTZ
        );

        if (tooltipLines.length) {
            var tooltip = createTooltipEl(tooltipLines);
            if (tooltip) {
                el.appendChild(tooltip);
                el.classList.add('dt-has-tooltip');
                if (!el.hasAttribute('tabindex')) {
                    el.setAttribute('tabindex', '0');
                }
            }
        }

        el.classList.add(HANDLED_CLASS);
    }

    function init() {
        var elements = document.querySelectorAll('.dt-inline:not(.' + HANDLED_CLASS + ')');
        for (var i = 0; i < elements.length; i++) {
            processElement(elements[i]);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    if (typeof mw !== 'undefined' && mw.hook) {
        mw.hook('wikipage.content').add(function () { init(); });
    }

})();
