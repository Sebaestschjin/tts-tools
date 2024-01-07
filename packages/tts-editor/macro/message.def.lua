--- Messages send from the extension to TTS as custom messages.
---@alias EditorMessage ObjectMessage

--- Sends the requested object GUID to TTS
---@class ObjectMessage
---@field type "object"
---@field guid string

--- Messages send from TTS to the extension as custom messages.
---@alias RequestEditorMessage RequestObjectMessage

--- Request to select an object from the currently loaded ones.
---@class RequestObjectMessage : __object__Options
---@field type "object"
