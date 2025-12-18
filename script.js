// =======================
// FIREBASE
// =======================
const firebaseConfig = {
  databaseURL: "https://appqrcode2-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);

// =======================
// METAS
// =======================
const META_HORA = 50;
const META_DIA = 440;

// =======================
// HORAS
// =======================
const HORAS = [
  ['"07:'], ['"08:'], ['"09:'], ['"10:'],
  ['"11:'], ['"12:'], ['"13:'], ['"14:'],
  ['"15:']
];

// =======================
// HORA EXTRA
// =======================
const HORA_EXTRA = [
  '"16:','"17:','"18:','"19:','"20:','"21:','"22:','"23:'
];

// =======================
// UTIL SEGURO
// =======================
function num(v) {
  v = Number(v);
  return isNaN(v) ? 0 : v;
}

function cor(valor, meta) {
  return valor >= meta ? "verde" : "vermelho";
}

function corHora(valor, meta) {
  if (valor >= meta) return "verde";
  if (valor >= meta * 0.8) return "amarelo";
  return "vermelho";
}

function formatarData(data) {
  if (!data) return "";
  const [a,m,d] = data.split("-");
  return `${d}-${m}-${a}`;
}

function dataHoje() {
  return new Date().toISOString().split("T")[0];
}

// =======================
// IDENTIFICAÇÃO
// =======================
function identificarHora(txt) {
  for (let i = 0; i < HORAS.length; i++) {
    if (HORAS[i].some(h => txt.includes(h))) return i;
  }
  return -1;
}

function identificarHoraExtra(txt) {
  return HORA_EXTRA.some(h => txt.includes(h));
}

// =======================
// META DINÂMICA
// =======================
function metaHoraAtual(indice) {
  const agora = new Date();
  const hAtual = agora.getHours();
  const mAtual = agora.getMinutes();
  const hTabela = 7 + indice;

  if (hTabela < hAtual) return META_HORA;
  if (hTabela > hAtual) return 0;

  return Math.round((META_HORA / 60) * mAtual);
}

function metaDiaHoje() {
  const agora = new Date();
  const hAtual = agora.getHours();
  const mAtual = agora.getMinutes();

  let meta = 0;

  HORAS.forEach((_, i) => {
    const hTabela = 7 + i;
    if (hTabela < hAtual) meta += META_HORA;
    else if (hTabela === hAtual)
      meta += Math.round((META_HORA / 60) * mAtual);
  });

  return num(meta);
}

// =======================
// TABELA
// =======================
const tbody = document.getElementById("tbody");
const linhas = {};
const totalLinha = document.getElementById("total-geral");

function criarTabela() {
  tbody.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    const nome = `CAF ${String(i).padStart(2,"0")}`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nome}</td>
      ${'<td>0</td>'.repeat(9)}
      <td class="extra">0</td>
      <td>0</td>
      <td>0</td>
      <td>0%</td>
      <td>0</td>
    `;
    tbody.appendChild(tr);
    linhas[nome] = tr;
  }
}

// =======================
// BUSCAR (ANTI-NaN)
// =======================
function buscar() {

  const dataInput = document.getElementById("data").value;
  if (!dataInput) return;

  const hoje = dataHoje();
  const data = formatarData(dataInput);
  const metaDia = num(dataInput === hoje ? metaDiaHoje() : META_DIA);

  let totalHoras = Array(9).fill(0);
  let totalExtra = 0;
  let totalGeral = 0;

  for (let i = 1; i <= 10; i++) {

    const celula = `Celula${String(i).padStart(2,"0")}`;
    const nome = `CAF ${String(i).padStart(2,"0")}`;
    const tr = linhas[nome];

    firebase.database()
      .ref(`usuarios/${celula}/historico/${data}`)
      .once("value")
      .then(snap => {

        let horas = Array(9).fill(0);
        let extra = 0;

        const dados = snap.val() || {};

        Object.values(dados).forEach(item => {
          const txt = JSON.stringify(item || "");
          const h = identificarHora(txt);
          if (h >= 0) horas[h]++;
          if (identificarHoraExtra(txt)) extra++;
        });

        const total = num(horas.reduce((a,b)=>a+b,0));
        const tendencia = total;

        const capacidade = metaDia > 0
          ? Math.round((total / metaDia) * 100)
          : 0;

        const desvio = total - metaDia;

        const tds = tr.children;

        horas.forEach((v, idx) => {
          const metaH = (dataInput === hoje)
            ? metaHoraAtual(idx)
            : META_HORA;

          tds[idx+1].textContent = v;
          tds[idx+1].className = corHora(v, metaH);

          totalHoras[idx] += v;
        });

        tds[10].textContent = extra;
        tds[11].textContent = total;

        tds[12].textContent = tendencia;
        tds[12].className = cor(tendencia, metaDia);

        tds[13].textContent = capacidade + "%";
        tds[13].className = capacidade >= 100 ? "verde" : "vermelho";

        tds[14].textContent = desvio;
        tds[14].className = desvio >= 0 ? "verde" : "vermelho";

        totalExtra += extra;
        totalGeral += total;

        totalLinha.innerHTML = `
          <td><b>TOTAL</b></td>
          ${totalHoras.map(v=>`<td>${v}</td>`).join("")}
          <td class="extra">${totalExtra}</td>
          <td>${totalGeral}</td>
          <td></td><td></td><td></td>
        `;
      });
  }
}

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("data").value = dataHoje();
  criarTabela();
  buscar();
  setInterval(buscar, 5000);
});
