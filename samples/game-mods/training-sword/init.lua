-- REA authored teaching mod; values are intentionally easy to inspect.
local damage = 6
local interval = 1
local uses = 100
core.register_tool("rea_training_sword:sword", {
  description = "REA Training Sword",
  inventory_image = "default_tool_steelsword.png",
  tool_capabilities = {full_punch_interval = interval, max_drop_level = 0,
    groupcaps = {}, damage_groups = {fleshy = damage}, punch_attack_uses = uses}
})
core.register_craft({output = "rea_training_sword:sword", recipe = {
  {"default:steel_ingot"}, {"default:steel_ingot"}, {"default:stick"}
}})
