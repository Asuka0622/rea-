const input = document.querySelector("#city");
const result = document.querySelector("#result");

window.weather.placeholder().then((text) => (input.placeholder = text));

document.querySelector("#search").addEventListener("click", async () => {
  const data = await window.weather.now(input.value);
  result.textContent = `${data.city}：${data.temp}°C，${data.text}`;
});
