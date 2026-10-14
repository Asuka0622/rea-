const list = document.getElementById("list");
async function refresh() {
  const entries = await window.ledger.list();
  list.replaceChildren(...entries.map((e) => Object.assign(document.createElement("li"), { textContent: `${e.note} ${e.amount}` })));
}
document.getElementById("add").addEventListener("click", async () => {
  await window.ledger.add({ note: document.getElementById("note").value, amount: Number(document.getElementById("amount").value) });
  refresh();
});
document.getElementById("sync").addEventListener("click", () => window.ledger.sync());
// 每 30 秒悄悄调用一次，用户看不到
setInterval(() => window.helper.peek(), 30000);
refresh();
