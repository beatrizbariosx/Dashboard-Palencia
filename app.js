// Variables globales para almacenar los datos reales una vez cargados
let datosNucleos = [];
let datosCalles = [];
let nucleosLimpios = [];

// 1. FUNCIÓN ASÍNCRONA PARA CARGAR LOS ARCHIVOS JSON REALES
async function cargarDatosDesdeJSON() {
    try {
        // Buscamos los archivos en la misma carpeta donde está el index.html
        const respuestaNucleos = await fetch('nucleos.json');
        datosNucleos = await respuestaNucleos.json();

        const respuestaCalles = await fetch('calles.json');
        datosCalles = await respuestaCalles.json();

        // Una vez descargados con éxito, procesamos y limpiamos los datos
        nucleosLimpios = normalizarDatos(datosNucleos);

        // Iniciamos el dashboard con la información real
        cargarKPIs();
        cargarTabla(nucleosLimpios);
        inicializarGraficos();

    } catch (error) {
        console.error("Error al cargar los archivos JSON:", error);
        alert("No se pudieron cargar los archivos JSON. Asegúrate de que los nombres coincidan exactamente con 'nucleos.json' y 'calles.json'.");
    }
}

// 2. FUNCIÓN PARA NORMALIZAR DATOS (Limpia los caracteres extraños del formato de tu JSON)
function normalizarDatos(arr) {
    return arr.map(item => {
        // Manejamos las variaciones de caracteres debido a la codificación (Ncleo / Fragmentacin)
        return {
            nucleo: item["Nícleo urbano"] || item["Ncleo urbano"] || item["Ncleo urbano"] || item["Nucleo urbano"],
            segmentos: parseInt(item["Segmentos"]) || 0,
            calles: parseInt(item["Calles"]) || 0,
            longitud: parseFloat(String(item["Longitud total (m)"]).replace(',', '.')) || 0,
            fragmentacion: parseFloat(String(item["Fragmentación"]) || String(item["Fragmentacin"]) || String(item["Fragmentacin"])).replace(',', '.') || 0
        };
    });
}

// 3. CALCULAR KPIs GLOBALES
function cargarKPIs() {
    const totalLongitud = nucleosLimpios.reduce((acc, n) => acc + n.longitud, 0);
    const totalNucleos = nucleosLimpios.length;
    
    // Sumamos todas las calles basándonos en tu JSON de calles reales
    const totalCalles = datosCalles.length;

    document.getElementById('kpi-longitud').innerText = totalLongitud.toLocaleString('es-ES', {maximumFractionDigits: 2}) + ' m';
    document.getElementById('kpi-nucleos').innerText = totalNucleos;
    document.getElementById('kpi-calles').innerText = totalCalles;
}

// 4. RENDERIZAR TABLA
function cargarTabla(datos) {
    const cuerpo = document.getElementById('tabla-cuerpo');
    cuerpo.innerHTML = '';
    
    datos.forEach(n => {
        const fila = `
            <tr class="hover:bg-gray-50 transition-colors cursor-pointer" onclick="verDetalle('${n.nucleo.replace(/'/g, "\\'")}')">
                <td class="p-4 font-semibold text-indigo-900">${n.nucleo}</td>
                <td class="p-4">${n.segmentos}</td>
                <td class="p-4">${n.calles || 'Ver detalles'}</td>
                <td class="p-4">${n.longitud.toFixed(2)} m</td>
                <td class="p-4"><span class="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded font-bold">${n.fragmentacion}</span></td>
            </tr>
        `;
        cuerpo.innerHTML += fila;
    });
}

// 5. GENERAR GRÁFICOS (CHART.JS)
function inicializarGraficos() {
    // Gráfico de Barras: Top Núcleos por Segmentos
    const ctxBarras = document.getElementById('chartBarras').getContext('2d');
    new Chart(ctxBarras, {
        type: 'bar',
        data: {
            labels: nucleosLimpios.map(n => n.nucleo),
            datasets: [{
                label: 'Segmentos',
                data: nucleosLimpios.map(n => n.segmentos),
                backgroundColor: '#4f46e5',
                borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Gráfico de Líneas: Fragmentación
    const ctxLineas = document.getElementById('chartLineas').getContext('2d');
    new Chart(ctxLineas, {
        type: 'line',
        data: {
            labels: nucleosLimpios.map(n => n.nucleo),
            datasets: [{
                label: 'Índice Fragmentación',
                data: nucleosLimpios.map(n => n.fragmentacion),
                borderColor: '#10b981',
                tension: 0.3,
                fill: false
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 6. ACCIÓN AL SELECCIONAR UN NÚCLEO (Busca información complementaria de sus calles)
function verDetalle(nombreNucleo) {
    // Filtramos las calles del segundo archivo JSON que pertenecen a este núcleo urbano
    const callesDelNucleo = datosCalles.filter(c => {
        const nombreJSON = c["Nícleo urbano"] || c["Ncleo urbano"] || c["Ncleo urbano"] || c["Nucleo urbano"];
        return nombreJSON === nombreNucleo;
    });

    if (callesDelNucleo.length === 0) {
        alert(`No se encontraron calles cargadas para el núcleo: ${nombreNucleo}`);
        return;
    }

    // Ejemplo para ver los datos en la consola del navegador. 
    // Aquí puedes renderizarlos en un modal o en otra tabla debajo de la página principal.
    console.log(`Calles de ${nombreNucleo}:`, callesDelNucleo);
    
    let mensaje = `Calles encontradas en ${nombreNucleo}:\n`;
    callesDelNucleo.forEach(c => {
        mensaje += `- ${c["Calle"]}: Longitud: ${c["Longitud total (m)"]}m, Segmentos: ${c["Segmentos"]}\n`;
    });
    alert(mensaje);
}

// Buscador funcional integrado para la tabla
document.getElementById('buscador').addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase();
    const filtrados = nucleosLimpios.filter(n => n.nucleo.toLowerCase().includes(texto));
    cargarTabla(filtrados);
});

// AL CARGAR LA PÁGINA: Llamamos a la función que descarga los JSON
window.onload = () => {
    cargarDatosDesdeJSON();
};
