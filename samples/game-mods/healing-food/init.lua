-- REA authored teaching mod.
local heal = 4
local yield = 1
core.register_craftitem("rea_healing_food:snack", {
  description = "REA Apple Snack", inventory_image = "default_apple.png",
  on_use = core.item_eat(heal)
})
core.register_craft({type = "shapeless", output = "rea_healing_food:snack " .. yield,
  recipe = {"default:apple", "default:apple"}
})
