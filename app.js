// Variables globales
let datosNucleos = [];
let datosCalles = [];
let nucleosLimpios = [];
let callesLimpias = [];
let vistaActual = 'nucleos'; // Puede ser 'nucleos' o 'calles'

// Instancias de los gráficos para poder destruirlos y redibujarlos sin errores
let graficoBarras = null;
let graficoLineas = null;

// 1. CARGA ASÍNCRONA DE LOS ARCHIVOS JSON
async function cargarDatosDesdeJSON() {
    try {
        const respuestaNucleos = await fetch('nucleos.json');
        datosNucleos = await respuestaNucleos.json();

        const respuestaCalles = await fetch('calles.json');
        datosCalles = await respuestaCalles.json();

        // Procesamos y limpiamos ambos conjuntos de datos
        nucleosLimpios = normalizarNucleos(datosNucleos);
        callesLimpias = normalizarCalles(datosCalles);

        // Inicializamos los elementos visuales primarios
        cargarKPIs();
        cambiarVista('nucleos'); // Por defecto arranca mostrando núcleos

    } catch (error) {
        console.error("Error al cargar los archivos JSON:", error);
        alert("Error al cargar los datos. Verifica que nucleos.json y calles.json estén en la raíz.");
    }
}

// 2. NORMALIZAR NÚCLEOS (Arregla codificaciones y convierte comas a puntos decimales)
function normalizarNucleos(arr) {
    return arr.map(item => {
        let rawNucleo = item["Nícleo urbano"] || item["Ncleo urbano"] || item["Nucleo urbano"] || "";
        let nucleoFormateado = rawNucleo.trim();

        // Si viene vacío o extraño, le damos un nombre limpio
        if (!nucleoFormateado || nucleoFormateado === "undefined") {
            nucleoFormateado = "Desconocido";
        }

        // Corrección estricta de cadenas numéricas con comas de Europa continental
        let fragRaw = item["Fragmentación"] || item["Fragmentacin"] || "0";
        let fragNum = parseFloat(String(fragRaw).replace(/\./g, '').replace(',', '.')) || 0;

        let longRaw = item["Longitud total (m)"] || "0";
        let longNum = parseFloat(String(longRaw).replace(/\./g, '').replace(',', '.')) || 0;

        return {
            nucleo: nucleoFormateado,
            segmentos: parseInt(item["Segmentos"]) || 0,
            calles: parseInt(item["Calles"]) || 0,
            longitud: longNum,
            fragmentacion: fragNum
        };
    }).filter(n => n.nucleo !== "Desconocido"); // Filtramos los desconocidos para limpiar los gráficos
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
    const totalLongitud = nucleosLimpios.reduce((acc, n) => acc + n.longitud, 0);
    const totalNucleos = nucleosLimpios.length;
    const totalCalles = callesLimpias.length;

    // Ponemos el valor calculado en la tarjeta de "Área Total Palencia"
    document.getElementById('kpi-longitud').innerText = totalLongitud.toLocaleString('es-ES', {maximumFractionDigits: 1}) + ' m';
    document.getElementById('kpi-nucleos').innerText = totalNucleos;
    document.getElementById('kpi-calles').innerText = totalCalles;
}

// 5. CONTROLADOR DE VISTAS (Alterna entre Núcleos y Calles desde el menú lateral)
function cambiarVista(vista) {
    vistaActual = vista;
    const btnNucleos = document.getElementById('btn-vista-nucleos');
    const btnCalles = document.getElementById('btn-vista-calles');
    const buscador = document.getElementById('buscador');

    // Cambiar estilos de los botones para saber cuál está activo
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
        // Para las calles hacemos un gráfico consolidando cuáles núcleos tienen calles más largas
        const topCallesLargos = [...callesLimpias].sort((a,b) => b.longitud - a.longitud).slice(0, 15);
        inicializarGraficosParaCalles(topCallesLargos);
    }
}

// 6. RENDERIZAR TABLA DE NÚCLEOS
function cargarTablaNucleos(datos) {
    const cabecera = document.getElementById('tabla-cabecera');
    cabecera.innerHTML = `
        <tr class="bg-gray-100 text-xs font-bold text-gray-600 uppercase border-b">
            <th class="p-4">Núcleo Urbano</th>
            <th class="p-4">Segmentos</th>
            <th class="p-4">Nº Calles</th>
            <th class="p-4">Longitud Total</th>
            <th class="p-4">Fragmentación</th>
        </tr>
    `;

    const cuerpo = document.getElementById('tabla-cuerpo');
    cuerpo.innerHTML = '';
    
    datos.forEach(n => {
        const fila = `
            <tr class="hover:bg-gray-50 transition-colors cursor-pointer" onclick="verDetalle('${n.nucleo.replace(/'/g, "\\'")}')">
                <td class="p-4 font-semibold text-indigo-900">${n.nucleo}</td>
                <td class="p-4">${n.segmentos}</td>
                <td class="p-4">${n.calles}</td>
                <td class="p-4">${n.longitud.toLocaleString('es-ES', {maximumFractionDigits:2})} m</td>
                <td class="p-4"><span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded font-bold">${n.fragmentacion.toFixed(3)}</span></td>
            </tr>
        `;
        cuerpo.innerHTML += fila;
    });
}

// 7. RENDERIZAR TABLA DE CALLES
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
    
    datos.slice(0, 300).forEach(c => { // Limitado a las primeras 300 filas en render por rendimiento
        const fila = `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="p-4 font-semibold text-amber-900">${c.calle}</td>
                <td class="p-4 text-gray-500">${c.nucleo}</td>
                <td class="p-4">${c.segmentos}</td>
                <td class="p-4">${c.longitud.toLocaleString('es-ES', {maximumFractionDigits:2})} m</td>
            </tr>
        `;
        cuerpo.innerHTML += fila;
    });
}

// 8. GRÁFICOS PARA LA VISTA DE NÚCLEOS (Muestra Calles en barra y Fragmentación real)
function inicializarGraficos(datos) {
    // Si ya existían gráficos creados, los destruimos para que se limpien bien los ejes
    if (graficoBarras) graficoBarras.destroy();
    if (graficoLineas) graficoLineas.destroy();

    // Ordenamos para sacar el Top 15 de núcleos con más calles
    const topNucleosCalles = [...datos].sort((a, b) => b.calles - a.calles).slice(0, 15);
    // Ordenamos para sacar el Top 15 con mayor fragmentación
    const topNucleosFrag = [...datos].sort((a, b) => b.fragmentacion - a.fragmentacion).slice(0, 15);

    document.getElementById('titulo-grafico-barras').innerText = "NÚMERO DE CALLES POR NÚCLEO (TOP 15)";

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

    const ctxLineas = document.getElementById('chartLineas').getContext('2d');
    graficoLineas = new Chart(ctxLineas, {
        type: 'line',
        data: {
            labels: topNucleosFrag.map(n => n.nucleo),
            datasets: [{
                label: 'Índice Fragmentación',
                data: topNucleosFrag.map(n => n.fragmentacion),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 9. GRÁFICOS ADAPTADOS PARA LA VISTA DE CALLES
function inicializarGraficosParaCalles(topCalles) {
    if (graficoBarras) graficoBarras.destroy();
    if (graficoLineas) graficoLineas.destroy();

    document.getElementById('titulo-grafico-barras').innerText = "TOP CALLES MÁS LARGAS (m)";

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

// 10. FUNCIÓN INTERACTIVA AL COMTEMPLAR UN NÚCLEO DESDE LA TABLA
function verDetalle(nombreNucleo) {
    const filtradas = callesLimpias.filter(c => c.nucleo.toLowerCase() === nombreNucleo.toLowerCase());
    
    if (filtradas.length === 0) {
        alert(`No hay registros de calles individuales para el núcleo: ${nombreNucleo}`);
        return;
    }
    
    let mensaje = `Calles detectadas en ${nombreNucleo}:\n`;
    filtradas.slice(0, 10).forEach(c => {
        mensaje += `• ${c.calle} (${c.longitud.toFixed(1)} m) - ${c.segmentos} segs.\n`;
    });
    if (filtradas.length > 10) mensaje += `...y ${filtradas.length - 10} calles más.`;
    
    alert(mensaje);
}

// 11. BUSCADOR INTEGRADO MULTIPROPÓSITO
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
