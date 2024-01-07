latestHandler = nil

---@param options __object__Options | nil
---@param handler fun(object: tts__Object)
function __object__(options, handler)
  options = options or {}

  local optionType = type(options)
  local handlerType = type(handler)
  if optionType ~= "table" or handlerType ~= "function" then
    error("Wrong argument types for __object__."
      .. "\nExpected table and function."
      .. "\nGot " .. optionType .. " and " .. handlerType)
  end

  latestHandler = handler

  ---@type RequestObjectMessage
  local message = {
    type = "object",
    withGlobal = options.withGlobal,
    title = options.title,
  }
  sendEditorMessage(message)
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
