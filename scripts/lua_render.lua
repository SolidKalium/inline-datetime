-- scripts/lua_render.lua
-- Renders one test case through Module:InlineDateTime and prints the HTML.
-- Called by build_artifacts.py. Must be run from the project root.
-- Usage: luajit scripts/lua_render.lua key=value key=value ...

dofile('test/mw_shims.lua')

local p = dofile('gadget/Module_InlineDateTime.lua')

local args = {}
for i = 1, #arg do
    local key, val = arg[i]:match('^([^=]+)=(.*)$')
    if key then args[key] = val end
end

io.write(p.main(makeFrame(args)))
