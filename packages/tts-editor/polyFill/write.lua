---@param options __write__Options
function __write__(options)
  ---@type WriteContentMessage
  local message = {
    type = "write",
    name = options.name,
    object = options.object,
    content = options.content,
    format = options.format,
  }
  sendEditorMessage(message)
end
