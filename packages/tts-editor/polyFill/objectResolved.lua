function __object__(_, handler)
  local guid = "${guid}"

  if guid == "-1" then
    handler(Global)
  else
    local object = getObjectFromGUID(guid)
    if not object or object.isDestroyed() then
      error("The object " .. tostring(guid) .. " doesn't exist or is already destroyed")
      return
    end

    handler(object)
  end
end
