---@param message EditorMessage
function onExternalMessage(message)
  if message.type == "object" then
    __handleObject__(message)
  end
end

---@param message RequestEditorMessage
function sendEditorMessage(message)
  sendExternalMessage(message)
end
