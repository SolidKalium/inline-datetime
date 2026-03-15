/**
 * DateTime inline converter
 *
 * Data attributes (emitted by Module:InlineDateTime / Template:InlineDateTime):
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

    var DEFAULT_SERVERS = [
        { key: 'asia',     label: 'Asia',     offsetMin:  480 },
        { key: 'americas', label: 'Americas', offsetMin: -300 }
    ];

    // Build SERVERS map from config page (window.inlineDatetimeConfig), falling
    // back to DEFAULT_SERVERS if the config page has not been installed or is malformed.
    var SERVERS = (function () {
        var list = (
            typeof window !== 'undefined' &&
            window.inlineDatetimeConfig &&
            Array.isArray(window.inlineDatetimeConfig.servers) &&
            window.inlineDatetimeConfig.servers.length
        ) ? window.inlineDatetimeConfig.servers : DEFAULT_SERVERS;
        var map = {};
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            if (s.key && s.label && typeof s.offsetMin === 'number') {
                map[s.key] = { label: s.label, offsetMin: s.offsetMin };
            }
        }
        return map;
    }());

    var HANDLED_CLASS = 'dt-handled';
    var SERVER_LABEL = '(server)'; // inline label for server-relative times
    var FORMATTER_CACHE = {};
    var MONTH_INDEX = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };

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

    function formatOffsetFields(utcMs, offsetMin) {
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

        return {
            month: month,
            timeCore: timeCore,
            ampm: ampm,
            year: year,
            monthIdx: d.getUTCMonth(),
            day: day,
            tzLabel: ''
        };
    }

    function getFormatter(cacheKey, options) {
        if (!FORMATTER_CACHE[cacheKey]) {
            FORMATTER_CACHE[cacheKey] = new Intl.DateTimeFormat('en-US', options);
        }
        return FORMATTER_CACHE[cacheKey];
    }

    function formatTimeZoneFields(utcMs, timeZone) {
        var formatter = getFormatter('full|' + timeZone, {
            timeZone: timeZone,
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
        });
        var parts = formatter.formatToParts(new Date(utcMs));
        var values = {};
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].type !== 'literal') {
                values[parts[i].type] = parts[i].value;
            }
        }

        return {
            month: values.month,
            timeCore: values.hour + ':' + values.minute,
            ampm: values.dayPeriod ? values.dayPeriod.toUpperCase() : '',
            year: parseInt(values.year, 10),
            monthIdx: MONTH_INDEX[values.month],
            day: parseInt(values.day, 10),
            tzLabel: values.timeZoneName || ''
        };
    }

    function formatFields(fields, showYear) {
        var dateStr = fields.month + ' ' + fields.day;
        if (showYear) {
            dateStr += ', ' + fields.year;
        }
        return {
            date: dateStr,
            timeCore: fields.timeCore,
            ampm: fields.ampm,
            year: fields.year,
            monthIdx: fields.monthIdx,
            day: fields.day,
            tzLabel: fields.tzLabel,
            full: dateStr + ', ' + fields.timeCore + ' ' + fields.ampm
        };
    }

    function getCurrentYearForTarget(target) {
        return getDisplayFields(Date.now(), target).year;
    }

    function getDisplayFields(utcMs, target) {
        if (target.kind === 'time-zone') {
            return formatTimeZoneFields(utcMs, target.timeZone);
        }
        var fields = formatOffsetFields(utcMs, target.offsetMin);
        fields.tzLabel = target.label || '';
        return fields;
    }

    function getTargetLabel(target, utcMs) {
        return getDisplayFields(utcMs, target).tzLabel;
    }

    function createFixedOffsetTarget(offsetMin, label) {
        return {
            kind: 'fixed-offset',
            offsetMin: offsetMin,
            label: label || formatOffset(offsetMin)
        };
    }

    function getResolvedTimeZone() {
        try {
            return new Intl.DateTimeFormat().resolvedOptions().timeZone || null;
        } catch (e) {
            return null;
        }
    }

    function getFallbackSystemTZ() {
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
        return createFixedOffsetTarget(offsetMin, abbr);
    }

    function getUserTZ() {
        var override = (typeof window !== 'undefined' && window.__INLINE_DATETIME_TEST_TIMEZONE) || '';
        var timeZone = override || getResolvedTimeZone();
        if (timeZone) {
            return {
                kind: 'time-zone',
                timeZone: timeZone
            };
        }
        return getFallbackSystemTZ();
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
    function inlineTzLabel(tzStr, userTZ, utcMs) {
        return (tzStr === 'server') ? SERVER_LABEL : getTargetLabel(userTZ, utcMs);
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
        var startTarget = startIsServer ? createFixedOffsetTarget(0, SERVER_LABEL) : userTZ;
        var startFields = getDisplayFields(startUtcMs, startTarget);
        var startLabel = inlineTzLabel(startTz, userTZ, startUtcMs);

        // Single point
        if (endUtcMs === null) {
            var startFmtSingle = formatFields(
                startFields,
                startFields.year !== getCurrentYearForTarget(startTarget)
            );
            startFmtSingle.tzLabel = startLabel;
            frag.appendChild(buildDateTimeNodes(startFmtSingle, 'dt-'));
            frag.appendChild(buildTzNode(startLabel, 'dt-'));
            return frag;
        }

        var endIsServer = endTz ? (endTz === 'server') : null;
        var endTarget = endIsServer ? createFixedOffsetTarget(0, SERVER_LABEL) : userTZ;
        var endFields = getDisplayFields(endUtcMs, endTarget);
        var forceYear = startFields.year !== endFields.year;
        var startFmt = formatFields(
            startFields,
            forceYear || startFields.year !== getCurrentYearForTarget(startTarget)
        );
        var endFmt = formatFields(
            endFields,
            forceYear || endFields.year !== getCurrentYearForTarget(endTarget)
        );
        var endLabel = inlineTzLabel(endTz, userTZ, endUtcMs);
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
            var startDisplayUtc, startTarget, startTzLabel;
            if (startIsServer) {
                startDisplayUtc = startUtcMs - srv.offsetMin * 60000;
                startTarget = userTZ;
                startTzLabel = getTargetLabel(userTZ, startDisplayUtc);
            } else {
                startDisplayUtc = startUtcMs;
                startTarget = createFixedOffsetTarget(srv.offsetMin, formatOffset(srv.offsetMin));
                startTzLabel = startTarget.label;
            }

            // Single point
            if (endUtcMs === null) {
                var startFields = getDisplayFields(startDisplayUtc, startTarget);
                var sf = formatFields(
                    startFields,
                    startFields.year !== getCurrentYearForTarget(startTarget)
                );
                var singleFrag = document.createDocumentFragment();
                singleFrag.appendChild(buildDateTimeNodes(sf, 'dt-tt-'));
                singleFrag.appendChild(buildTzNode(startTzLabel, 'dt-tt-'));
                lines.push({ label: srv.label, frag: singleFrag });
                continue;
            }

            // Compute end in display tz
            var endDisplayUtc, endTarget, endTzLabel;
            if (endIsServer) {
                endDisplayUtc = endUtcMs - srv.offsetMin * 60000;
                endTarget = userTZ;
                endTzLabel = getTargetLabel(userTZ, endDisplayUtc);
            } else {
                endDisplayUtc = endUtcMs;
                endTarget = createFixedOffsetTarget(srv.offsetMin, formatOffset(srv.offsetMin));
                endTzLabel = endTarget.label;
            }

            var startFields2 = getDisplayFields(startDisplayUtc, startTarget);
            var endFields = getDisplayFields(endDisplayUtc, endTarget);
            var forceYear = startFields2.year !== endFields.year;
            var sf2 = formatFields(
                startFields2,
                forceYear || startFields2.year !== getCurrentYearForTarget(startTarget)
            );
            var ef = formatFields(
                endFields,
                forceYear || endFields.year !== getCurrentYearForTarget(endTarget)
            );
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

    // --- Tooltip positioning ---

    /**
     * Clamp the tooltip horizontally so it stays within the viewport.
     * The tooltip is position:absolute centered above el via translateX(-50%).
     * If it would overflow left or right, shift it and counter-shift the arrow
     * by setting --dt-tt-shift on the tooltip element (arrow CSS reads this).
     */
    function clampTooltip(tooltip) {
        var MARGIN = 8;
        // Reset to natural centered position before measuring so we work from
        // the browser's actual computed position, not a JS approximation of it.
        // This also handles wrapped inline elements where CSS left:50% may not
        // equal el.getBoundingClientRect() center.
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.setProperty('--dt-tt-shift', '0px');

        var ttRect = tooltip.getBoundingClientRect(); // forces reflow; uses reset transform
        var vw = document.documentElement.clientWidth;
        var shift = 0;
        if (ttRect.right > vw - MARGIN) {
            shift = (vw - MARGIN) - ttRect.right;
        } else if (ttRect.left < MARGIN) {
            shift = MARGIN - ttRect.left;
        }
        if (shift !== 0) {
            tooltip.style.transform = 'translateX(calc(-50% + ' + shift + 'px))';
            tooltip.style.setProperty('--dt-tt-shift', shift + 'px');
        }
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
                el.setAttribute('role', 'button');
                el.setAttribute('aria-expanded', 'false');
                el.addEventListener('mouseenter', function () {
                    clampTooltip(tooltip);
                });
                el.addEventListener('click', function () {
                    var isOpen = el.classList.contains('dt-open');
                    el.classList.toggle('dt-open', !isOpen);
                    el.setAttribute('aria-expanded', String(!isOpen));
                    if (!isOpen) {
                        clampTooltip(tooltip);
                    }
                });
                el.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape') {
                        if (el.classList.contains('dt-open')) {
                            el.classList.remove('dt-open');
                            el.setAttribute('aria-expanded', 'false');
                            e.stopPropagation();
                        }
                    } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        el.click();
                    }
                });
            }
        }

        el.classList.add(HANDLED_CLASS);
    }

    function closeAllExcept(target) {
        var open = document.querySelectorAll('.dt-inline.dt-open');
        for (var i = 0; i < open.length; i++) {
            if (open[i] !== target) {
                open[i].classList.remove('dt-open');
                open[i].setAttribute('aria-expanded', 'false');
            }
        }
    }

    function init() {
        var elements = document.querySelectorAll('.dt-inline:not(.' + HANDLED_CLASS + ')');
        for (var i = 0; i < elements.length; i++) {
            processElement(elements[i]);
        }
    }

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.dt-inline.dt-open')) {
            closeAllExcept(null);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('inline-datetime-rerender', function () { init(); });
    }
    if (typeof mw !== 'undefined' && mw.hook) {
        mw.hook('wikipage.content').add(function () { init(); });
    }

})();
