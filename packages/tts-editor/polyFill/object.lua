latestHandler = nil

---@param options? __object__Options
---@param handler fun(object: tts__Object)
function __object__(options, handler)
  options = options or {}
  latestHandler = handler

  sendEditorMessage({
    type = "object",
    withGlobal = options.withGlobal,
    title = options.title,
  })
end

---@param message ObjectMessage
function __handleObject__(message)
  local guid = message.guid
  if guid == "-1" then
    latestHandler(Global)
  else
    local object = getObjectFromGUID(guid)
    if not object or object.isDestroyed() then
      error("The object " .. tostring(guid) .. " doesn't exist or is already destroyed")
      return
    end
    latestHandler(object)
  end
end
