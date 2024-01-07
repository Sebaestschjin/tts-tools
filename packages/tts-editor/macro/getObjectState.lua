__object__({
  withGlobal = true
}, function(o)
  local state = ""
  local guid = ""
  if o == Global then
    state = Global.call("onSave")
    guid = "-1"
  else
    state = o.script_state
    guid = o.getGUID()
  end

  __write__({
    name = "state.txt",
    object = guid,
    content = state
  })
end)
