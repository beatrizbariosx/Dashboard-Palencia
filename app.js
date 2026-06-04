let nucleos = [];
let calles = [];

// cargar datos
fetch("nucleos.json")
  .then(r => r.json())
  .then(data => nucleos = data);

fetch("calles.json")
  .then(r => r.json())
  .then(data => calles = data);

function buscar() {
  const texto = document.getElementById("search").value.toLowerCase();
  const resultadoDiv = document.getElementById("resultado");

  // buscar núcleo
  const nucleo = nucleos.find(n =>
    n["Núcleo urbano"].toLowerCase().includes(texto)
  );

  // buscar calle
  const calle = calles.find(c =>
    c["Calle"].toLowerCase().includes(texto)
  );

  let html = "";

  if (nucleo) {
    html += "<h2>Núcleo urbano</h2>";
    html += crearTabla(nucleo);
    graficar(nucleo);
  }

  if (calle) {
    html += "<h2>Calle</h2>";
    html += crearTabla(calle);
    graficar(calle);
  }

  if (!nucleo && !calle) {
    html = "<p>No encontrado</p>";
  }

  resultadoDiv.innerHTML = html;
}

function crearTabla(obj) {
  let html = "<table>";
  for (let key in obj) {
    html += `<tr><td>${key}</td><td>${obj[key]}</td></tr>`;
  }
  html += "</table>";
  return html;
}

let chart;

function graficar(obj) {
  const ctx = document.getElementById("grafico");

  const labels = Object.keys(obj).filter(k => typeof obj[k] === "number");
  const data = labels.map(k => obj[k]);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Valores",
        data: data
      }]
    }
  });
}
