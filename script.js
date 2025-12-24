// =======================
// FIREBASE
// =======================
const firebaseConfig = {
  databaseURL: "https://appqrcode-43874-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);

// =======================
// METAS
// =======================
const META_HORA = 50;
const META_DIA = 440;

// =======================
// UTIL
// =======================
function cor(v, m) {
  return v >= m ? "verde" : "vermelho";
}

function corHora(v, m) {
  if (v >= m) return "verde";
  if (v >= m * 0.8) return "amarelo";
  return "vermelho";
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function formatarData(d) {
  const [a,m,dd] = d.split("-");
  return `${dd}-${m}-${a}`;
}

// =======================
// IDENTIFICA HORA
// =======================
function identificarHora(txt) {
  const m = txt.match(/"(\d{2}):(\d{2})/);
  if (!m) return -1;

  const h = Number(m[1]);
  const min = Number(m[2]);

  if (h === 7) return 0;
  if (h === 8) return 1;
  if (h === 9) return 2;
  if (h === 10) return 3;
  if (h === 11 || h === 12) return 4;
  if (h === 13) return 5;
  if (h === 14) return 6;
  if (h === 15) return 7;
  if (h === 16 && min <= 47) return 8;

  return -1;
}

function identificarHoraExtra(txt) {
  const m = txt.match(/"(\d{2}):(\d{2})/);
  if (!m) return false;

  const h = Number(m[1]);
  const min = Number(m[2]);

  return h > 16 || (h === 16 && min >= 48);
}

// =======================
// META DINÂMICA
// =======================
function metaHoraDinamica(indice) {
  const agora = new Date();
  const hAtual = agora.getHours();
  const mAtual = agora.getMinutes();
  const MAPA_HORAS = [7,8,9,10,11,13,14,15,16];
  const hTabela = MAPA_HORAS[indice];

  if (hTabela < hAtual) return META_HORA;
  if (hTabela > hAtual) return 0;

  return Math.round((META_HORA / 60) * mAtual);
}

function metaDiaDinamica() {
  const agora = new Date();
  const hAtual = agora.getHours();
  const mAtual = agora.getMinutes();
  const MAPA_HORAS = [7,8,9,10,11,13,14,15,16];

  let meta = 0;
  MAPA_HORAS.forEach(h => {
    if (h < hAtual) meta += META_HORA;
    else if (h === hAtual)
      meta += Math.round((META_HORA / 60) * mAtual);
  });

  return meta;
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
// BUSCAR
// =======================
function buscar() {
  const dataInput = document.getElementById("data").value;
  if (!dataInput) return;

  const hoje = hojeISO();
  const data = formatarData(dataInput);

  const ehDia24 = dataInput.endsWith("-12-24");

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

        const horas = Array(9).fill(0);
        let extra = 0;

        Object.values(snap.val() || {}).forEach(item => {
          const txt = JSON.stringify(item);
          const h = identificarHora(txt);
          if (h >= 0) horas[h]++;
          if (identificarHoraExtra(txt)) extra++;
        });

        const total = horas.reduce((a,b)=>a+b,0);

        // =======================
        // 🔥 TENDÊNCIA (AJUSTE SOMENTE DIA 24)
        // =======================
        let tendencia = 0;
        if (total > 0) {

          let metaUsada;

          if (ehDia24) {
            // só trabalhou até a 5ª hora
            metaUsada = META_HORA * 5;
          } else {
            metaUsada = dataInput === hoje ? metaDiaDinamica() : META_DIA;
          }

          tendencia = Math.round((total / metaUsada) * META_DIA);
        }

        const capacidade = Math.round((tendencia / META_DIA) * 100);
        const desvio = tendencia - META_DIA;

        const tds = tr.children;

        horas.forEach((v, idx) => {
          const metaH = dataInput === hoje ? metaHoraDinamica(idx) : META_HORA;
          tds[idx+1].textContent = v;
          tds[idx+1].className = corHora(v, metaH);
          totalHoras[idx] += v;
        });

        tds[10].textContent = extra;
        tds[11].textContent = total;

        tds[12].textContent = tendencia;
        tds[12].className = cor(tendencia, META_DIA);

        tds[13].textContent = capacidade + "%";
        tds[13].className = capacidade >= 100 ? "verde" : "vermelho";

        tds[14].textContent = desvio;
        tds[14].className = desvio >= 0 ? "verde" : "vermelho";

        totalExtra += extra;
        totalGeral += total;

        // =======================
        // 🔥 TENDÊNCIA GERAL (MESMA REGRA)
        // =======================
        let tendenciaGeral = 0;
        if (totalGeral > 0) {

          let metaGeral;

          if (ehDia24) {
            metaGeral = META_HORA * 5;
          } else {
            metaGeral = dataInput === hoje ? metaDiaDinamica() : META_DIA;
          }

          tendenciaGeral = Math.round((totalGeral / metaGeral) * META_DIA);
        }

        totalLinha.innerHTML = `
          <td><b>TOTAL</b></td>
          ${totalHoras.map(v=>`<td>${v}</td>`).join("")}
          <td class="extra">${totalExtra}</td>
          <td>${totalGeral}</td>
          <td class="preto">${tendenciaGeral}</td>
          <td></td>
        `;
      });
  }
}

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("data").value = hojeISO();
  criarTabela();
  buscar();
  setInterval(buscar, 5000);
});
