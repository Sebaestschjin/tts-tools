---@meta foo

---@class (exact) __object__Options
---@field title? string The title to show for the selection
---@field placeholder? string
---@field withGlobal? boolean When true, Global can also be selected as an object

---@param options __object__Options
---@param handler fun(object: tts__Object)
function __object__(options, handler) end

---@class (exact) __write__Options
---@field name? string
---@field object? tts__Object
---@field content string
---@field format? "auto" | "none"

---@param options  __write__Options
function __write__(options) end
