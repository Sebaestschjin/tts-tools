--- Messages send from the extension to TTS as custom messages.
---@alias EditorMessage ObjectMessage

--- Sends the requested object GUID to TTS
---@class ObjectMessage
---@field type "object"
---@field guid string

--- Messages send from TTS to the extension as custom messages.
---@alias RequestEditorMessage RequestObjectMessage | WriteContentMessage

--- Request to select an object from the currently loaded ones.
---@class RequestObjectMessage
---@field type "object"
---@field title? string The title to show for the selection
---@field placeholder? string
---@field withGlobal? boolean When true, Global can also be selected as an object

---@class WriteContentMessage
---@field type "write"
---@field name? string
---@field object? string
---@field content string
---@field format? MessageFormat

---@alias MessageFormat "auto" | "none"
