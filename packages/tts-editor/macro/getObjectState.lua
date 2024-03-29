__object__({
  withGlobal = true,
  placeholder = "Select an object to get its state",
}, function(obj)
  local state = ""
  if obj == Global then
    state = Global.call("onSave")
  else
    state = obj.script_state
  end

  __write__({
    name = "state.txt",
    object = obj,
    content = state
  })
end)
