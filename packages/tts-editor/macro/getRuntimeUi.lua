__object__({
  withGlobal = true,
  placeholder = "Select an object to get its UI",
}, function(object)
  __write__({
    name = "runtime.xml",
    object = object,
    content = object.UI.getXml()
  })
end)
