const box = document.querySelector("#text");
const list = document.querySelector("#list");

async function refresh() {
  const notes = await window.notes.list();
  list.replaceChildren(...notes.map((note) => Object.assign(document.createElement("li"), { textContent: note.text })));
}

document.querySelector("#add").addEventListener("click", async () => {
  await window.notes.add(box.value);
  box.value = "";
  refresh();
});

// 每 30 秒自动刷新一次列表
setInterval(refresh, 30000);
refresh();
