const firebaseURL = "https://appqrcode2-default-rtdb.firebaseio.com";

const META_HORA = 50;
const META_DIA = 440;

// =======================
// COR POR META
// =======================
function cor(valor, meta) {
  if (valor >= meta) return "green";
  if (valor >= meta * 0.8) return "yellow";
  return "red";
}

// =======================
// FORMATA DATA
// =======================
function formatarData(data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}-${mes}-${ano}`;
}

// =======================
// IDENTIFICA HORA
// =======================
function identificarHora(texto) {

  if (texto.includes('"07:')) return 0;
  if (texto.includes('"08:')) return 1;
  if (texto.includes('"09:')) return 2;
  if (texto.includes('"10:')) return 3;
  if (texto.includes('"11:') || texto.includes('"12:')) return 4;
  if (texto.includes('"13:')) return 5;
  if (texto.includes('"14:')) return 6;
  if (texto.includes('"15:')) return 7;

  // 9H → até 16:47
  const validos9h = [
    '"16:0',
    '"16:1',
    '"16:2',
    '"16:3',
    '"16:40',
    '"16:41',
    '"16:42',
    '"16:43',
    '"16:44',
    '"16:45',
    '"16:46',
    '"16:47'
  ];

  for (let v of validos9h) {
    if (texto.includes(v)) return 8;
  }

  // HORA EXTRA → após 16:48
  if (
    texto.includes('"16:48') ||
    texto.includes('"16:49') ||
    texto.includes('"16:5') ||
    texto.includes('"16:6') ||
    texto.includes('"16:7') ||
    texto.includes('"16:8') ||
    texto.includes('"16:9')
  ) {
    return 9;
  }

  return null;
}

// =======================
// BUSCAR
// =======================
async function buscar() {

  const dataInput = document.getElementById("data").value;
  if (!dataInput) return alert("Selecione a data");

  const data = formatarData(dataInput);
  const tabela = document.getElementById("tabela");
  const totais = document.getElementById("totais");

  tabela.innerHTML = "";
  totais.innerHTML = "";

  let somaHoras = Array(9).fill(0);

  for (let i = 1; i <= 10; i++) {

    const celulaFirebase = `Celula${String(i).padStart(2, "0")}`;
    const nomeCAF = `CAF ${String(i).padStart(2, "0")}`;
    const url = `${firebaseURL}/usuarios/${celulaFirebase}/historico/${data}.json`;

    const res = await fetch(url);
    const dados = await res.json();

    let horas = Array(9).fill(0);
    let horaExtra = 0;

    if (dados) {
      Object.values(dados).forEach(item => {
        const texto = JSON.stringify(item);
        const h = identificarHora(texto);

        if (h === 9) horaExtra++;
        else if (h !== null) horas[h]++;
      });
    }

    const total = horas.reduce((a, b) => a + b, 0);
    const capacidade = Math.round((total / META_DIA) * 100);
    const desvio = total - META_DIA;

    horas.forEach((v, idx) => somaHoras[idx] += v);

    let tr = `<tr><td>${nomeCAF}</td>`;

    horas.forEach(v => {
      tr += `<td class="${cor(v, META_HORA)}">${v}</td>`;
    });

    tr += `
      <td class="extra">${horaExtra}</td>
      <td>${total}</td>
      <td class="${cor(total, META_DIA)}">${total}</td>
      <td class="${cor(capacidade, 100)}">${capacidade}%</td>
      <td class="${desvio >= 0 ? 'green' : 'red'}">${desvio}</td>
    </tr>`;

    tabela.innerHTML += tr;
  }

  // TOTAL GERAL
  let totalGeral = somaHoras.reduce((a, b) => a + b, 0);
  let tr = `<td>TOTAL</td>`;

  somaHoras.forEach(v => {
    tr += `<td class="${cor(v, META_HORA * 10)}">${v}</td>`;
  });

  tr += `<td class="extra">-</td><td>${totalGeral}</td><td colspan="3"></td>`;
  totais.innerHTML = tr;
}
