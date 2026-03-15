-- Run from project root: luajit test/run_lua_tests.lua

-- ── Shims ────────────────────────────────────────────────────────────────────
dofile('test/mw_shims.lua')

-- ── Load module ───────────────────────────────────────────────────────────────

local p = dofile('gadget/Module_InlineDateTime.lua')

-- ── Test runner ───────────────────────────────────────────────────────────────

local pass, fail = 0, 0

-- Calls p.main with the given args table, then checks that every expected
-- string appears as a plain substring of the output.
local function run(name, args, ...)
    local ok, result = pcall(function()
        return p.main(makeFrame(args))
    end)
    if not ok then
        print('ERROR: ' .. name)
        print('       ' .. tostring(result))
        fail = fail + 1
        return
    end
    for _, expected in ipairs({...}) do
        if not result:find(expected, 1, true) then
            print('FAIL:  ' .. name)
            print('       missing: ' .. expected)
            print('       output:  ' .. result)
            fail = fail + 1
            return
        end
    end
    print('pass:  ' .. name)
    pass = pass + 1
end

-- ── Hard error tests ──────────────────────────────────────────────────────────

run('hard error: no args',
    {},
    'dt-error', 'dt-error-hard',
    '[no start time specified]',
    'Pages with InlineDateTime errors')

run('hard error: blank start',
    { start = '   ' },
    'dt-error-hard', '[no start time specified]',
    'Pages with InlineDateTime errors')

run('hard error: start absent, raw provided (raw not shown)',
    { raw = 'something' },
    'dt-error-hard',
    'Pages with InlineDateTime errors')

-- ── Soft error tests ──────────────────────────────────────────────────────────

run('soft error: unparseable start',
    { start = 'not-a-date' },
    'dt-error', 'dt-error-soft',
    'not-a-date',
    'Pages with InlineDateTime errors')

run('soft error: valid start + unparseable end',
    { start = '2026-03-12 06:00', ['end'] = 'garbage' },
    'dt-error-soft',
    '2026-03-12 06:00',
    'Pages with InlineDateTime errors')

run('soft error: both inputs shown in output when no raw',
    { start = '2026-03-12 06:00', ['end'] = 'garbage' },
    '2026-03-12 06:00',
    'garbage')

run('soft error: raw shown when start unparseable',
    { start = 'bad-date', raw = 'Some Event' },
    'dt-error-soft', 'Some Event')

run('soft error: raw shown when end unparseable',
    { start = '2026-03-12 06:00', ['end'] = 'bad', raw = 'Some Event' },
    'dt-error-soft', 'Some Event')

run('soft error: html entities escaped in start input',
    { start = '<script>xss</script>' },
    'dt-error-soft',
    '&lt;script&gt;xss&lt;/script&gt;')

-- ── Valid output: data attributes ─────────────────────────────────────────────

run('valid: server time emits correct attributes',
    { start = '2026-03-12 06:00' },
    'class="dt-inline"',
    'data-dt-start="2026-03-12T06:00"',
    'data-dt-start-tz="server"')

run('valid: absolute time +8 normalised to +08:00',
    { start = '2026-03-12 06:00 +8' },
    'data-dt-start="2026-03-12T06:00+08:00"',
    'data-dt-start-tz="+8"')

run('valid: absolute time -5 normalised to -05:00',
    { start = '2026-03-12 06:00 -5' },
    'data-dt-start="2026-03-12T06:00-05:00"',
    'data-dt-start-tz="-5"')

run('valid: offset with minutes (+5:30)',
    { start = '2026-03-12 06:00 +5:30' },
    'data-dt-start="2026-03-12T06:00+05:30"')

run('valid: UTC prefix accepted (UTC+8)',
    { start = '2026-03-12 06:00 UTC+8' },
    'data-dt-start="2026-03-12T06:00+08:00"',
    'data-dt-start-tz="+8"')

run('valid: GMT prefix accepted (GMT-5)',
    { start = '2026-03-12 06:00 GMT-5' },
    'data-dt-start="2026-03-12T06:00-05:00"',
    'data-dt-start-tz="-5"')

run('valid: lowercase utc prefix accepted',
    { start = '2026-03-12 06:00 utc+8' },
    'data-dt-start="2026-03-12T06:00+08:00"')

run('valid: positional arg [1]',
    { [1] = '2026-03-12 06:00 +8' },
    'data-dt-start="2026-03-12T06:00+08:00"')

run('valid: end attribute emitted',
    { start = '2026-03-12 06:00', ['end'] = '2026-03-12 12:00' },
    'data-dt-start="2026-03-12T06:00"',
    'data-dt-end="2026-03-12T12:00"',
    'data-dt-end-tz="server"')

run('valid: end positional arg [2]',
    { [1] = '2026-03-12 06:00', [2] = '2026-03-12 12:00' },
    'data-dt-start', 'data-dt-end')

run('valid: server filter attribute',
    { start = '2026-03-12 06:00', server = 'asia' },
    'data-dt-server="asia"')

run('valid: raw attribute present when raw provided',
    { start = '2026-03-12 06:00', raw = 'Launch Day' },
    'data-dt-raw', 'Launch Day')

-- ── Valid output: fallback text ───────────────────────────────────────────────

run('fallback: server time format',
    { start = '2026-03-12 06:00' },
    'Mar 12', '06:00', 'server time')

run('fallback: absolute time shows UTC offset',
    { start = '2026-03-12 06:00 +8' },
    'Mar 12', '06:00', 'UTC+8')

run('fallback: past year shown in fallback',
    { start = '2024-06-15 09:00' },
    '2024')

run('fallback: current year hidden in fallback',
    { start = '2026-06-15 09:00' },
    'Jun 15', '09:00')

run('fallback: range same date collapses date for end',
    { start = '2026-03-12 06:00', ['end'] = '2026-03-12 12:00' },
    'Mar 12', '06:00', '12:00', 'server time')

run('fallback: range across dates shows both dates',
    { start = '2026-03-12 06:00', ['end'] = '2026-03-13 06:00' },
    'Mar 12', 'Mar 13')

run('fallback: raw replaces auto-generated text',
    { start = '2026-03-12 06:00', raw = 'Launch Day' },
    'Launch Day')

-- ── Summary ───────────────────────────────────────────────────────────────────

print(string.format('\n%d passed, %d failed', pass, fail))
if fail > 0 then os.exit(1) end
