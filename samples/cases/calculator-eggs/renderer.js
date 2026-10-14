const screen = document.querySelector("#screen");
let display = "";

function press(key) {
  if (key === "=") {
    // 彩蛋：算出这个数字时，屏幕上会冒出一行字
    if (display === "1314520") {
      screen.textContent = "做这个计算器的人，祝你天天开心";
      return;
    }
    display = String(Function(`return (${display})`)());
  } else {
    display += key;
  }
  screen.textContent = display;
}

document.querySelectorAll("[data-key]").forEach((button) => button.addEventListener("click", () => press(button.dataset.key)));

// 经典彩蛋：依次按下这些方向键和字母，界面会变成彩虹色
const SECRET_KEYS = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let progress = 0;
document.addEventListener("keydown", (event) => {
  progress = event.key === SECRET_KEYS[progress] ? progress + 1 : 0;
  if (progress === SECRET_KEYS.length) {
    document.body.classList.add("rainbow");
    progress = 0;
  }
});

// 隐藏的调试页：地址后面加上这一段才会显示
if (location.hash === "#/__debug") document.querySelector("#debug-panel").hidden = false;
