---@param options __write__Options
function __write__(options)
  ---@type WriteContentMessage
  local message = {
    type = "write",
    name = options.name,
    content = options.content
  }
  sendEditorMessage(message)
end
