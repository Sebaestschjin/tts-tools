function __object__(_, handler)
  local guid = "${guid}"
  local object = getObjectFromGUID(guid)
  if not object or object.isDestroyed() then
    error("The object " .. tostring(guid) .. " doesn't exist or is already destroyed")
    return
  end

  handler(object)
end
