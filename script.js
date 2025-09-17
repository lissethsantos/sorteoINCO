// Variables globales
let empleados = [];
let premios = [];
let asignacionPremios = [];
let ganadores = [];
let sorteando = false;

// Función para leer CSV empleados
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const data = [];
  for(let i=0; i<lines.length; i++) {
    const [codigo, nombre, area] = lines[i].split(',').map(s => s.trim());
    if(codigo && nombre && area) {
      data.push({codigo, nombre, area});
    }
  }
  return data;
}

// Manejar carga empleados
document.getElementById('inputEmpleados').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    empleados = parseCSV(ev.target.result);
    if(empleados.length === 0) {
      alert('Archivo de empleados vacío o mal formato.');
      return;
    }
    // Mostrar tabla empleados
    const tbody = document.querySelector('#tablaEmpleados tbody');
    tbody.innerHTML = '';
    empleados.forEach(emp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${emp.codigo}</td><td>${emp.nombre}</td><td>${emp.area}</td>`;
      tbody.appendChild(tr);
    });
    document.getElementById('tablaEmpleados').classList.remove('hidden');
    document.getElementById('section-premios').classList.remove('hidden');
  };
  reader.readAsText(file);
});

// Agregar premio
document.getElementById('btnAgregarPremio').addEventListener('click', () => {
  const nombre = document.getElementById('premioNombre').value.trim();
  const cantidad = parseInt(document.getElementById('premioCantidad').value);

  if(!nombre || isNaN(cantidad) || cantidad < 1) {
    alert('Completa nombre y cantidad válida para el premio');
    return;
  }

  premios.push({nombre, cantidad});
  document.getElementById('premioNombre').value = '';
  document.getElementById('premioCantidad').value = '';

  // Actualizar tabla premios
  actualizarTablaPremios();
  document.getElementById('btnAsignarPremios').disabled = false;
});

function actualizarTablaPremios() {
  const tbody = document.querySelector('#tablaPremios tbody');
  tbody.innerHTML = '';
  premios.forEach((p, i) => {
    tbody.innerHTML += `<tr>
      <td>${p.nombre}</td>
      <td>${p.cantidad}</td>
      <td><button onclick="eliminarPremio(${i})">Eliminar</button></td>
    </tr>`;
  });
  if(premios.length === 0) {
    document.getElementById('btnAsignarPremios').disabled = true;
  }
}

function eliminarPremio(i) {
  premios.splice(i,1);
  actualizarTablaPremios();
}
window.eliminarPremio = eliminarPremio;

// Ir a asignar premios
document.getElementById('btnAsignarPremios').addEventListener('click', () => {
  document.getElementById('section-asignacion').classList.remove('hidden');
  // Rellenar tabla asignacion
  const tbody = document.querySelector('#tablaAsignacion tbody');
  tbody.innerHTML = '';
  premios.forEach((p,i) => {
    tbody.innerHTML += `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.cantidad}</td>
      <td><input type="number" min="0" max="${p.cantidad}" name="prod_${i}" value="0" required></td>
      <td><input type="number" min="0" max="${p.cantidad}" name="vent_${i}" value="0" required></td>
      <td><input type="number" min="0" max="${p.cantidad}" name="adm_${i}" value="0" required></td>
      <td><input type="number" min="0" max="${p.cantidad}" name="gen_${i}" value="0" required></td>
    </tr>`;
  });
  window.location = '#section-asignacion';
});

// Validar suma de asignación por premio y guardar
document.getElementById('formAsignacion').addEventListener('submit', (e) => {
  e.preventDefault();
  asignacionPremios = [];
  const formData = new FormData(e.target);
  let valid = true;

  premios.forEach((p,i) => {
    const prod = parseInt(formData.get(`prod_${i}`)) || 0;
    const vent = parseInt(formData.get(`vent_${i}`)) || 0;
    const adm = parseInt(formData.get(`adm_${i}`)) || 0;
    const gen = parseInt(formData.get(`gen_${i}`)) || 0;

    const suma = prod + vent + adm + gen;
    if(suma !== p.cantidad) {
      alert(`La suma de asignaciones para ${p.nombre} debe ser igual a la cantidad total (${p.cantidad}).`);
      valid = false;
    }
    asignacionPremios.push({nombre: p.nombre, prod, vent, adm, gen});
  });

  if(!valid) return;

  // Mostrar sección resultados
  document.getElementById('section-resultados').classList.remove('hidden');
  window.location = '#section-resultados';
});

// Función para obtener empleados por área
function empleadosPorArea(area) {
  return empleados.filter(e => e.area.toLowerCase() === area.toLowerCase());
}

// Sorteo en vivo
document.getElementById('btnIniciarSorteo').addEventListener('click', () => {
  if(sorteando) return; // evitar doble click
  sorteando = true;
  ganadores = [];
  document.getElementById('resultadoSorteo').innerHTML = '';
  document.getElementById('btnExportarGanadores').classList.add('hidden');
  sortearPremios();
});

async function sortearPremios() {
  for(const asignacion of asignacionPremios) {
    // Por área
    await sortearParaArea(asignacion, 'prod', 'Producción');
    await sortearParaArea(asignacion, 'vent', 'Ventas');
    await sortearParaArea(asignacion, 'adm', 'Administración');
    await sortearParaArea(asignacion, 'gen', 'General');
  }
  alert('Sorteo finalizado');
  sorteando = false;
  document.getElementById('btnExportarGanadores').classList.remove('hidden');
}

async function sortearParaArea(asignacion, campo, areaNombre) {
  const cantidad = asignacion[campo];
  if(cantidad === 0) return;
  let participantes = [];

  if(areaNombre === 'General') {
    participantes = empleados.filter(e => !ganadores.some(g => g.codigo === e.codigo));
  } else {
    participantes = empleadosPorArea(areaNombre).filter(e => !ganadores.some(g => g.codigo === e.codigo));
  }

  if(participantes.length === 0) {
    alert(`No hay empleados disponibles para el área ${areaNombre} para el premio ${asignacion.nombre}`);
    return;
  }

  for(let i = 0; i < cantidad; i++) {
    if(participantes.length === 0) break;
    const idx = Math.floor(Math.random() * participantes.length);
    const ganador = participantes.splice(idx,1)[0];
    ganadores.push({ ...ganador, premio: asignacion.nombre, areaPremio: areaNombre });
    mostrarGanador(ganador, asignacion.nombre, areaNombre);
    await delay(1000);
  }
}

function mostrarGanador(ganador, premio, area) {
  const div = document.getElementById('resultadoSorteo');
  const p = document.createElement('p');
  p.textContent = `🎉 ${ganador.nombre} (${ganador.area}) ganó ${premio} asignado a ${area}`;
  div.appendChild(p);
  div.scrollTop = div.scrollHeight;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Exportar ganadores a CSV
document.getElementById('btnExportarGanadores').addEventListener('click', () => {
  if(ganadores.length === 0) {
    alert('No hay ganadores para exportar.');
    return;
  }
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Código,Nombre,Área,Premio,Área del premio\n";
  ganadores.forEach(g => {
    const row = `${g.codigo},${g.nombre},${g.area},${g.premio},${g.areaPremio}`;
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "ganadores_sorteo.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
