__object__({
  placeholder = "Select an object to locate it",
}, function(object)
  local interval = 0.1
  local totalTime = 5
  local repeats = (1 / interval) * totalTime

  Wait.time(function()
    object.highlightOn({
      r = math.random(),
      g = math.random(),
      b = math.random(),
    })
  end, interval, repeats)

  Wait.time(function()
    object.highlightOff()
  end, totalTime)

  for _, player in ipairs(Player.getPlayers()) do
    player.pingTable(object.getPosition())
  end
end)
