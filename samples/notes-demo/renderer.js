window.notes.list().then((items) => {
  for (const item of items) document.getElementById("list").append(Object.assign(document.createElement("li"), { textContent: item }));
});
document.addEventListener("keydown", (e) => { if (e.key === "s" && e.ctrlKey) window.notes.save(prompt("note")); });
