let nucleos = [];
let calles = [];
let chart;

// cargar datos
fetch("nucleos.json").then(r => r.json()).then(d => {
  nucleos = d;
  cargarOpciones();
});

fetch("calles.json").then(r => r.json()).then(d => {
  calles = d;
});

function cargarOpciones() {
  const tipo = document.getElementById("tipo").value;
  const select = document.getElementById("elemento");

  select.innerHTML = "";

  let lista = tipo === "nucleos" ? nucleos : calles;

  lista.forEach(item => {
    const option = document.createElement("option");

    option.value = JSON.stringify(item);

    option.text =
      tipo === "nucleos"
        ? item["Núcleo urbano"]
        : item["Calle"];

    select.appendChild(option);
  });

  mostrarDatos();
}

function mostrarDatos() {
  const select = document.getElementById("elemento");
  if (!select.value) return;

  const obj = JSON.parse(select.value);

  mostrarTabla(obj);
  mostrarGrafico(obj);
}

function mostrarTabla(obj) {
  let html = "<table>";

  for (let k in obj) {
    html += `<tr><td>${k}</td><td>${obj[k]}</td></tr>`;
  }

  html += "</table>";

  document.getElementById("resultado").innerHTML = html;
}

function mostrarGrafico(obj) {
  const ctx = document.getElementById("grafico");

  const labels = [];
  const values = [];

  for (let k in obj) {
    if (typeof obj[k] === "number") {
      labels.push(k);
      values.push(obj[k]);
    }
  }

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Valores",
        data: values
      }]
    }
  });
}
