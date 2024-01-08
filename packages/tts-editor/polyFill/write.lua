---@param options __write__Options
function __write__(options)
  local guid = nil

  if options.object then
    if options.object == Global then
      guid = "-1"
    else
      guid = options.object.getGUID()
    end
  end

  ---@type WriteContentMessage
  local message = {
    type = "write",
    name = options.name,
    object = guid,
    content = options.content,
    format = options.format,
  }
  sendEditorMessage(message)
end
