-- test/mw_shims.lua
-- Minimal MediaWiki environment shims for local testing and build rendering.
-- Sourced by test/run_lua_tests.lua and scripts/lua_render.lua via dofile().
-- Must be run from the project root.
--
-- Extend this file if Module:InlineDateTime starts using additional mw.* functions.

mw = {
    text = {
        trim = function(s)
            if type(s) ~= 'string' then return s end
            return s:match('^%s*(.-)%s*$')
        end
    }
}

-- Builds a fake frame object matching the shape the module expects:
--   frame:getParent().args
function makeFrame(args)
    local parent = { args = args }
    return { getParent = function() return parent end }
end
