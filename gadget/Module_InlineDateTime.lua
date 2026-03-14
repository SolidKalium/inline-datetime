-- Module:InlineDateTime
-- Parses datetime template input and emits structured HTML for client-side
-- timezone conversion. JS enhances with tooltips and local time display.
--
-- Usage from Template:InlineDateTime:
--   {{#invoke:InlineDateTime|main}}
--
-- Template parameters:
--   |start=2026-03-12 06:00        (server time, no offset)
--   |start=2026-03-12 06:00 +8     (absolute, UTC+8)
--   |end=2026-03-12 12:00          (optional, same offset rules)
--   |server=asia                   (optional, allowlist filter for tooltip)
--   |raw=                          (optional, raw display text override)
--
-- Offset in the datetime string: +N, -N, +H:MM, -H:MM
-- No offset means "server time" (same wall-clock for each server)

local p = {}

local ERROR_CATEGORY = '[[Category:Pages with InlineDateTime errors]]'

local function htmlEscape(s)
    return s:gsub('&', '&amp;'):gsub('<', '&lt;'):gsub('>', '&gt;'):gsub('"', '&quot;')
end

local function hardErrorSpan()
    return '<span class="dt-error dt-error-hard">[no start time specified]</span>' .. ERROR_CATEGORY
end

local function softErrorSpan(display)
    return '<span class="dt-error dt-error-soft">' .. htmlEscape(display) .. '</span>' .. ERROR_CATEGORY
end

-- Parse a datetime string like "2026-03-12 06:00 +8" or "2026-03-12 06:00"
-- Returns { date = "2026-03-12", time = "06:00", tz = "+8" or nil }
local function parseDatetime(s)
    if not s or s == '' then return nil end
    s = mw.text.trim(s)

    local result = {}

    -- Try to extract offset at end: +8, -5, +05:30, -05:00, etc.
    local base, sign, offset = s:match('^(.-)%s+([%+%-])(%d+:?%d*)$')
    if base and sign and offset then
        result.tz = sign .. offset
        s = mw.text.trim(base)
    end

    -- Parse date and time from remaining string
    -- Expected: YYYY-MM-DD HH:MM
    local date, time = s:match('^(%d%d%d%d%-%d%d%-%d%d)%s+(%d%d:%d%d)$')
    if date and time then
        result.date = date
        result.time = time
    else
        -- Maybe just a date?
        date = s:match('^(%d%d%d%d%-%d%d%-%d%d)$')
        if date then
            result.date = date
        else
            return nil
        end
    end

    return result
end

-- Format a parsed datetime for no-JS fallback display
-- Produces something like "Mar 12, 06:00" or "Mar 12, 2026, 06:00"
local function formatFallback(parsed)
    if not parsed then return '' end

    local months = {
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    }

    local y, m, d = parsed.date:match('^(%d+)-(%d+)-(%d+)$')
    if not y then return parsed.date .. ' ' .. (parsed.time or '') end

    m = tonumber(m)
    d = tonumber(d)
    local monthStr = months[m] or '???'

    local parts = {}
    table.insert(parts, monthStr .. ' ' .. d)
    -- Include year only if it's not the current year
    local currentYear = os.date('!%Y')
    if y ~= currentYear then
        table.insert(parts, y)
    end

    local dateStr = table.concat(parts, ', ')

    if parsed.time then
        dateStr = dateStr .. ', ' .. parsed.time
    end

    -- Append timezone info for no-JS users
    if parsed.tz then
        dateStr = dateStr .. ' (UTC' .. parsed.tz .. ')'
    else
        dateStr = dateStr .. ' (server time)'
    end

    return dateStr
end

-- Build ISO string for data attribute
-- e.g. "2026-03-12T06:00" or "2026-03-12T06:00+08:00"
local function toISOish(parsed)
    if not parsed then return '' end
    local s = parsed.date
    if parsed.time then
        s = s .. 'T' .. parsed.time
    end
    if parsed.tz then
        -- Normalize offset to ±HH:MM
        local sign, h, m = parsed.tz:match('^([%+%-])(%d+):?(%d*)$')
        if sign then
            h = string.format('%02d', tonumber(h))
            m = (m and m ~= '') and string.format('%02d', tonumber(m)) or '00'
            s = s .. sign .. h .. ':' .. m
        end
    end
    return s
end

function p.main(frame)
    local args = frame:getParent().args
    local startStr = mw.text.trim(args['start'] or args[1] or '')
    local endStr = mw.text.trim(args['end'] or args[2] or '')
    local server = args['server'] or ''
    local raw = args['raw'] or ''

    -- Hard error: start is absent entirely; raw is meaningless without it
    if startStr == '' then
        return hardErrorSpan()
    end

    local startParsed = parseDatetime(startStr)
    local endProvided = endStr ~= ''
    local endParsed = endProvided and parseDatetime(endStr) or nil

    -- Soft error: start present but unparseable, or end present but unparseable.
    -- Treat the pair as fully invalid; no half-valid state.
    if not startParsed or (endProvided and not endParsed) then
        local display
        if raw ~= '' then
            display = raw
        elseif endProvided then
            display = startStr .. ' \xe2\x80\x93 ' .. endStr
        else
            display = startStr
        end
        return softErrorSpan(display)
    end

    -- Build data attributes
    local dataAttrs = {}
    if startParsed then
        table.insert(dataAttrs, 'data-dt-start="' .. toISOish(startParsed) .. '"')
        if startParsed.tz then
            table.insert(dataAttrs, 'data-dt-start-tz="' .. startParsed.tz .. '"')
        else
            table.insert(dataAttrs, 'data-dt-start-tz="server"')
        end
    end
    if endParsed then
        table.insert(dataAttrs, 'data-dt-end="' .. toISOish(endParsed) .. '"')
        if endParsed.tz then
            table.insert(dataAttrs, 'data-dt-end-tz="' .. endParsed.tz .. '"')
        else
            table.insert(dataAttrs, 'data-dt-end-tz="server"')
        end
    end
    if server ~= '' then
        table.insert(dataAttrs, 'data-dt-server="' .. mw.text.trim(server) .. '"')
    end
    if raw ~= '' then
        table.insert(dataAttrs, 'data-dt-raw="1"')
    end

    -- Build fallback display text
    local display
    if raw ~= '' then
        display = raw
    else
        local startDisplay = formatFallback(startParsed)
        if endParsed then
            local endDisplay
            -- If same date as start, just show time for end
            if startParsed and endParsed.date == startParsed.date then
                endDisplay = endParsed.time or ''
                if endParsed.tz then
                    endDisplay = endDisplay .. ' (UTC' .. endParsed.tz .. ')'
                elseif not startParsed.tz then
                    -- Both server time, same date: don't repeat "(server time)"
                    -- it's implied by the start
                else
                    endDisplay = endDisplay .. ' (server time)'
                end
            else
                endDisplay = formatFallback(endParsed)
            end
            display = startDisplay .. ' – ' .. endDisplay
        else
            display = startDisplay
        end
    end

    -- Assemble the span
    local attrStr = table.concat(dataAttrs, ' ')
    return '<span class="dt-inline" ' .. attrStr .. '>' .. display .. '</span>'
end

return p
