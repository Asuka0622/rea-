const hud = document.querySelector("#hud");

function show(state) {
  hud.textContent = `第 ${state.day} 天 · 金币 ${state.gold}`;
  if (state.warning) alert(state.warning);
}

window.farm.state().then(show);
document.querySelector("#sell").addEventListener("click", async () => show(await window.farm.sell("tomato")));
document.querySelector("#sleep").addEventListener("click", async () => show(await window.farm.sleep()));
