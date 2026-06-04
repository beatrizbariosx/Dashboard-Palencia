// Variables globales
let datosNucleos = [];
let datosCalles = [];
let datosAreas = [];
let nucleosLimpios = [];
let callesLimpias = [];
let vistaActual = 'nucleos';

let graficoBarras = null;
let graficoLineas = null;

// 1. CARGA ASÍNCRONA DE LOS TRES ARCHIVOS JSON
async function cargarDatosDesdeJSON() {
    try {
        const respuestaNucleos = await fetch('nucleos.json');
        datosNucleos = await respuestaNucleos.json();

        const respuestaCalles = await fetch('calles.json');
        datosCalles = await respuestaCalles.json();

        // Cargamos el nuevo JSON de áreas y habitantes
        const respuestaAreas = await fetch('areas_nucleos.json');
        datosAreas = await respuestaAreas.json();

        // Procesamos y cruzamos los datos
        callesLimpias = normalizarCalles(datosCalles);
        nucleosLimpios = normalizarNucleos(datosNucleos, datosAreas);

        cargarKPIs();
        cambiarVista('nucleos');

    } catch (error) {
        console.error("Error al cargar los archivos JSON:", error);
        alert("Error al cargar los datos. Verifica que nucleos.json, calles.json y areas_nucleos.json estén en la raíz.");
    }
}

// 2. NORMALIZAR NÚCLEOS (Une los datos de nucleos.json con areas_nucleos.json)
function normalizarNucleos(arrNucleos, arrAreas) {
    return arrNucleos.map(item => {
        let rawNucleo = item["Nícleo urbano"] || item["Ncleo urbano"] || item["Nucleo urbano"] || "";
        let nucleoFormateado = rawNucleo.trim();

        if (!nucleoFormateado || nucleoFormateado === "undefined") {
            nucleoFormateado = "Desconocido";
        }

        let longRaw = item["Longitud total (m)"] || "0";
        let longNum = parseFloat(String(longRaw).replace(/\./g, '').replace(',', '.')) || 0;

        // Buscamos coincidencia en el nuevo archivo de áreas por el nombre del núcleo urbano
        let infoArea = arrAreas.find(a => {
            let nameA = a["Nícleo urbano"] || a["Ncleo urbano"] || a["Nucleo urbano"] || "";
            return nameA.trim().toLowerCase() === nucleoFormateado.toLowerCase();
        });

        // Extraemos área y habitantes si existen en tu nuevo JSON
        let areaNum = 0;
        let habitantesNum = 0;
        if (infoArea) {
            let areaRaw = infoArea["Área (m²)"] || infoArea["Area (m²)"] || infoArea["Superficie"] || "0";
            areaNum = parseFloat(String(areaRaw).replace(/\./g, '').replace(',', '.')) || 0;

            let habRaw = infoArea["Habitantes"] || infoArea["Población"] || infoArea["Poblacion"] || "0";
            habitantesNum = parseInt(String(habRaw).replace(/\./g, '')) || 0;
        }

        return {
            nucleo: nucleoFormateado,
            segmentos: parseInt(item["Segmentos"]) || 0,
            calles: parseInt(item["Calles"]) || 0,
            longitud: longNum,
            area: areaNum,
            habitantes: habitantesNum
        };
    }).filter(n => n.nucleo !== "Desconocido");
}

// 3. NORMALIZAR CALLES
function normalizarCalles(arr) {
    return arr.map(item => {
        let rawNucleo = item["Nícleo urbano"] || item["Ncleo urbano"] || item["Nucleo urbano"] || "Palencia General";
        let longRaw = item["Longitud total (m)"] || "0";
        let longNum = parseFloat(String(longRaw).replace(/\./g, '').replace(',', '.')) || 0;

        return {
            nucleo: rawNucleo.trim(),
            calle: item["Calle"] || "Calle sin nombre",
            segmentos: parseInt(item["Segmentos"]) || 0,
            longitud: longNum
        };
    });
}

// 4. CALCULAR KPIs GLOBALES
function cargarKPIs() {
    document.getElementById('kpi-nucleos').innerText = nucleosLimpios.length;
    document.getElementById('kpi-calles').innerText = callesLimpias.length;
}

// 5. CONTROLADOR DE VISTAS (Cambio entre botones)
function cambiarVista(vista) {
    vistaActual = vista;
    const btnNucleos = document.getElementById('btn-vista-nucleos');
    const btnCalles = document.getElementById('btn-vista-calles');
    const buscador = document.getElementById('buscador');

    if (vista === 'nucleos') {
        btnNucleos.className = "w-full bg-indigo-600 text-white text-left px-3 py-2 rounded-lg text-sm font-semibold shadow transition-all";
        btnCalles.className = "w-full text-gray-600 hover:bg-gray-100 text-left px-3 py-2 rounded-lg text-sm transition-all";
        document.getElementById('titulo-tabla').innerText = "AUDITORÍA POR NÚCLEO URBANO";
        buscador.placeholder = "Buscar núcleo...";
        
        cargarTablaNucleos(nucleosLimpios);
        inicializarGraficos(nucleosLimpios);
    } else {
        btnCalles.className = "w-full bg-indigo-600 text-white text-left px-3 py-2 rounded-lg text-sm font-semibold shadow transition-all";
        btnNucleos.className = "w-full text-gray-600 hover:bg-gray-100 text-left px-3 py-2 rounded-lg text-sm transition-all";
        document.getElementById('titulo-tabla').innerText = "AUDITORÍA POR CALLES INDIVIDUALES";
        buscador.placeholder = "Buscar calle...";
        
        cargarTablaCalles(callesLimpias);
        const topCallesLargos = [...callesLimpias].sort((a,b) => b.longitud - a.longitud).slice(0, 15);
        inicializarGraficosParaCalles(topCallesLargos);
    }
}

// 6. TABLA NÚCLEOS (Con tus nuevos campos de Área y Habitantes)
function cargarTablaNucleos(datos) {
    const cabecera = document.getElementById('tabla-cabecera');
    cabecera.innerHTML = `
        <tr class="bg-gray-100 text-xs font-bold text-gray-600 uppercase border-b">
            <th class="p-4">Análisis Núcleo Urbano</th>
            <th class="p-4">Nº Calles</th>
            <th class="p-4">Segmentos</th>
            <th class="p-4">Longitud Total</th>
            <th class="p-4">Área Territorial</th>
            <th class="p-4">Habitantes</th>
        </tr>
    `;

    const cuerpo = document.getElementById('tabla-cuerpo');
    cuerpo.innerHTML = '';
    
    datos.forEach(n => {
        // Formateos limpios para que no salgan columnas vacías si no cruzó algún núcleo
        const mostrarArea = n.area > 0 ? `${n.area.toLocaleString('es-ES')} m²` : 'Sin datos';
        const mostrarHabitantes = n.habitantes > 0 ? `${n.habitantes.toLocaleString('es-ES')} hab.` : 'Sin datos';

        const fila = `
            <tr class="hover:bg-gray-50 transition-colors cursor-pointer" onclick="verDetalle('${n.nucleo.replace(/'/g, "\\'")}')">
                <td class="p-4 font-semibold text-indigo-900">${n.nucleo}</td>
                <td class="p-4">${n.calles}</td>
                <td class="p-4">${n.segmentos}</td>
                <td class="p-4">${n.longitud.toLocaleString('es-ES', {maximumFractionDigits:1})} m</td>
                <td class="p-4 text-gray-600">${mostrarArea}</td>
                <td class="p-4 font-bold text-emerald-700">${mostrarHabitantes}</td>
            </tr>
        `;
        cuerpo.innerHTML += fila;
    });
}

// 7. TABLA CALLES
function cargarTablaCalles(datos) {
    const cabecera = document.getElementById('tabla-cabecera');
    cabecera.innerHTML = `
        <tr class="bg-gray-100 text-xs font-bold text-gray-600 uppercase border-b">
            <th class="p-4">Calle</th>
            <th class="p-4">Núcleo Urbano</th>
            <th class="p-4">Segmentos</th>
            <th class="p-4">Longitud</th>
        </tr>
    `;

    const cuerpo = document.getElementById('tabla-cuerpo');
    cuerpo.innerHTML = '';
    
    datos.slice(0, 300).forEach(c => {
        const fila = `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="p-4 font-semibold text-amber-900">${c.calle}</td>
                <td class="p-4 text-gray-500">${c.nucleo}</td>
                <td class="p-4">${c.segmentos}</td>
                <td class="p-4">${c.longitud.toLocaleString('es-ES', {maximumFractionDigits:1})} m</td>
            </tr>
        `;
        cuerpo.innerHTML += fila;
    });
}

// 8. GRÁFICOS DE LA VISTA NÚCLEOS (Calles + Habitantes de areas_nucleos.json)
function inicializarGraficos(datos) {
    if (graficoBarras) graficoBarras.destroy();
    if (graficoLineas) graficoLineas.destroy();

    // Ordenar Top 15 por número de calles
    const topNucleosCalles = [...datos].sort((a, b) => b.calles - a.calles).slice(0, 15);
    // Ordenar Top 15 por número de Habitantes reales
    const topNucleosPoblacion = [...datos].sort((a, b) => b.habitantes - a.habitantes).slice(0, 15);

    document.getElementById('titulo-grafico-barras').innerText = "NÚMERO DE CALLES POR NÚCLEO (TOP 15)";
    document.getElementById('titulo-grafico-lineas').innerText = "POBLACIÓN POR NÚCLEO (TOP 15)";

    // Gráfico de barras (Calles)
    const ctxBarras = document.getElementById('chartBarras').getContext('2d');
    graficoBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
            labels: topNucleosCalles.map(n => n.nucleo),
            datasets: [{
                label: 'Cantidad de Calles',
                data: topNucleosCalles.map(n => n.calles),
                backgroundColor: '#4f46e5',
                borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Gráfico de Línea con Relleno (Habitantes del nuevo JSON)
    const ctxLineas = document.getElementById('chartLineas').getContext('2d');
    graficoLineas = new Chart(ctxLineas, {
        type: 'line',
        data: {
            labels: topNucleosPoblacion.map(n => n.nucleo),
            datasets: [{
                label: 'Habitantes Registrados',
                data: topNucleosPoblacion.map(n => n.habitantes),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 9. GRÁFICOS PARA LA VISTA DE CALLES
function inicializarGraficosParaCalles(topCalles) {
    if (graficoBarras) graficoBarras.destroy();
    if (graficoLineas) graficoLineas.destroy();

    document.getElementById('titulo-grafico-barras').innerText = "TOP CALLES MÁS LARGAS (m)";
    document.getElementById('titulo-grafico-lineas').innerText = "SEGMENTACIÓN DEL TOP CALLES";

    const ctxBarras = document.getElementById('chartBarras').getContext('2d');
    graficoBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
            labels: topCalles.map(c => c.calle.slice(0, 15)),
            datasets: [{
                label: 'Metros lineales',
                data: topCalles.map(c => c.longitud),
                backgroundColor: '#f59e0b',
                borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxLineas = document.getElementById('chartLineas').getContext('2d');
    graficoLineas = new Chart(ctxLineas, {
        type: 'line',
        data: {
            labels: topCalles.map(c => c.calle.slice(0, 15)),
            datasets: [{
                label: 'Segmentos de la calle',
                data: topCalles.map(c => c.segmentos),
                borderColor: '#ef4444',
                tension: 0.2,
                fill: false
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 10. DETALLES AL HACER CLICK
function verDetalle(nombreNucleo) {
    const filtradas = callesLimpias.filter(c => c.nucleo.toLowerCase() === nombreNucleo.toLowerCase());
    
    if (filtradas.length === 0) {
        alert(`No hay registros de calles individuales para el núcleo: ${nombreNucleo}`);
        return;
    }
    
    let mensaje = `Calles detectadas en ${nombreNucleo}:\n`;
    filtradas.slice(0, 10).forEach(c => {
        mensaje += `• ${c.calle} (${c.longitud.toFixed(1)} m)\n`;
    });
    if (filtradas.length > 10) mensaje += `...y ${filtradas.length - 10} calles más.`;
    
    alert(mensaje);
}

// 11. BUSCADOR INTEGRADO
document.getElementById('buscador').addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase();
    if (vistaActual === 'nucleos') {
        const filtrados = nucleosLimpios.filter(n => n.nucleo.toLowerCase().includes(texto));
        cargarTablaNucleos(filtrados);
    } else {
        const filtrados = callesLimpias.filter(c => c.calle.toLowerCase().includes(texto) || c.nucleo.toLowerCase().includes(texto));
        cargarTablaCalles(filtrados);
    }
});

window.onload = () => {
    cargarDatosDesdeJSON();
};
