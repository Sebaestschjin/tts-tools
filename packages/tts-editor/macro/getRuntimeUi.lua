__object__({
  withGlobal = true
}, function(object)
  __write__({
    name = "runtime.xml",
    object = object,
    content = object.UI.getXml()
  })
end)
