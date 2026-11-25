let state = {
  logged: sessionStorage.getItem("biblioteca_session") !== null,
  role: "librarian",
  screen: "dashboard",
  fechaSimulada: null,
  report: null,
  theme: localStorage.getItem("biblioteca_theme") === "dark" ? "dark" : "light",
  bookCategory: "Todas",
  bookAvailability: "all",
  selectedUser: null,
  selectedBook: null,
  returned: [],
  renewed: [],
  userFilter: "all",
};

function aplicarTema() {
  document.body.classList.toggle("theme-dark", state.theme === "dark");
  localStorage.setItem("biblioteca_theme", state.theme);
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  aplicarTema();
  render();
}
const icons = {
  dashboard: "▦",
  books: "▤",
  loans: "▧",
  returns: "↶",
  renewals: "↻",
  fines: "!",
  users: "●",
  reports: "▥",
  "my-loans": "▧",
};

// 1. MENÚS DIFERENCIADOS
const navL = [
  // Administrador (ve todo)
  ["dashboard", "Dashboard"],
  ["books", "Libros"],
  ["loans", "Préstamos"],
  ["returns", "Devoluciones"],
  ["renewals", "Renovaciones"],
  ["fines", "Multas"],
  ["users", "Usuarios"],
  ["reports", "Reportes"],
];

const navBib = [
  // Bibliotecario (no ve Usuarios)
  ["dashboard", "Dashboard"],
  ["books", "Libros"],
  ["loans", "Préstamos"],
  ["returns", "Devoluciones"],
  ["renewals", "Renovaciones"],
  ["fines", "Multas"],
  ["reports", "Reportes"],
];

const navS = [
  ["my-loans", "Mis Préstamos"],
  ["books", "Catálogo"],
];

const $ = (s) => document.querySelector(s);
const money = (n) => "$" + n.toLocaleString("es-CL");
const date = (s) => new Date(s + "T12:00:00").toLocaleDateString("es-CL");
const initials = (n) =>
  n
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("");

function toast(message) {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="toast">${message}</div>`,
  );
  setTimeout(() => document.querySelector(".toast")?.remove(), 2200);
}

function actualizarFechaHora() {
  const elemento = document.getElementById("liveDate");
  if (!elemento) return;

  const ahora = new Date();
  const fechaTexto = state.fechaSimulada
    ? new Date(state.fechaSimulada + "T12:00:00").toLocaleDateString("es-CL", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : ahora.toLocaleDateString("es-CL", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  elemento.textContent = `${fechaTexto} · ${ahora.toLocaleTimeString("es-CL", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

function updateSearch(stateKey, value, selector) {
  state[stateKey] = value;
  render();

  requestAnimationFrame(() => {
    const input = document.querySelector(selector);
    if (!input) return;
    input.focus();
    const position = input.value.length;
    input.setSelectionRange(position, position);
  });
}

async function cargarTiempoSistema() {
  try {
    const response = await fetch("api.php?accion=obtener_tiempo");
    const data = await response.json();
    if (data.success) {
      state.fechaSimulada = data.fecha;
      actualizarFechaHora();
    }
  } catch (error) {
    console.error("No fue posible cargar la fecha simulada", error);
  }
}

async function simularTiempo(dias) {
  try {
    const response = await fetch("api.php?accion=simular_tiempo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dias }),
    });
    const data = await response.json();
    if (!data.success) {
      toast(data.msg || "No fue posible adelantar el tiempo");
      return;
    }

    state.fechaSimulada = data.fecha;
    state.returned = [];
    toast(`Tiempo adelantado. Usuarios bloqueados: ${data.usuarios_bloqueados}`);
    await cargarDatosYRenderizar(false);
  } catch (error) {
    toast("Error de conexión al simular el tiempo");
  }
}

async function reiniciarTiempo() {
  try {
    const response = await fetch("api.php?accion=reiniciar_tiempo", {
      method: "POST",
    });
    const data = await response.json();
    if (!data.success) {
      toast(data.msg || "No fue posible reiniciar el tiempo");
      return;
    }

    state.fechaSimulada = data.fecha;
    state.returned = [];
    toast("Tiempo reiniciado a la fecha actual");
    await cargarDatosYRenderizar(false);
  } catch (error) {
    toast("Error de conexión al reiniciar el tiempo");
  }
}

function metric(value, title, sub, color = "#3b82f6", bg = "#eff6ff") {
  return `<div class="card metric"><div class="metric-top"><div class="metric-icon" style="color:${color};background:${bg}">${icons[title.toLowerCase()] || "•"}</div></div><div class="metric-value">${value}</div><div class="metric-title">${title}</div><div class="metric-sub">${sub}</div></div>`;
}

function userCell(u) {
  // Usamos u.tipo o u.type, y u.nombre o u.name
  const nombre = u.nombre || u.name || "Usuario";
  const rol = u.tipo || u.type || "Sin rol";
  return `<div class="user-cell"><div class="avatar">${initials(nombre)}</div><div><strong>${nombre}</strong><div class="sub">${u.rut} · ${rol}</div></div></div>`;
}

function statusBadge(status) {
  return status === "overdue"
    ? `<span class="badge error">● Atrasado</span>`
    : status === "returned"
      ? `<span class="badge neutral">● Devuelto</span>`
      : `<span class="badge success">● A tiempo</span>`;
}

// --- PANTALLA DE LOGIN ---
function login() {
  const totalLibros = books.length;
  const usuariosActivos = users.length;
  const prestamosTotales = loans.length;
  const devoluciones = loans.filter((loan) => loan.status === "returned").length;
  const tasaDevolucion = prestamosTotales
    ? Math.round((devoluciones / prestamosTotales) * 100)
    : 0;

  $("#root").innerHTML = `
    <div class="login">
      <section class="login-brand">
        <div>
          <div class="brand" style="padding:0;border:0">
            <img class="logo" src="assets/logo_inacap.png" alt="INACAP">
            <div><strong>INACAP</strong><small>Sistema de Biblioteca</small></div>
          </div>
          <h1>Biblioteca<br><span>Digital</span></h1>
          <p>Plataforma integrada de gestión de préstamos, devoluciones y control de colección bibliográfica para la comunidad INACAP.</p>
          <div class="grid stats">
            <div class="login-stat"><strong>${totalLibros}</strong><small>Libros registrados</small></div>
            <div class="login-stat"><strong>${usuariosActivos}</strong><small>Usuarios activos</small></div>
            <div class="login-stat"><strong>${tasaDevolucion}%</strong><small>Tasa de devolución</small></div>
            <div class="login-stat"><strong>24/7</strong><small>Acceso digital</small></div>
          </div>
        </div>
        <div class="copyright">© 2026 INACAP — Instituto Nacional de Capacitación Profesional</div>
      </section>
      
      <section class="login-form-area">
        <form class="login-box" onsubmit="doLogin(event)">
          <h2>Iniciar sesión</h2>
          <p>Ingresa con tus credenciales institucionales</p>
          
          <div class="field">
            <label>Tipo de usuario</label>
            <div class="roles">
              ${[
                ["librarian", "Bibliotecario"],
                ["student", "Estudiante"],
                ["admin", "Administrador"],
              ]
                .map(
                  (r) =>
                    `<button type="button" class="role ${state.role === r[0] ? "active" : ""}" onclick="pickRole('${r[0]}')">${r[1]}</button>`,
                )
                .join("")}
            </div>
          </div>
          
          <div class="field">
            <label>Correo institucional</label>
            <input id="loginUser" class="input" placeholder="usuario@inacap.cl">
          </div>
          
          <div class="field">
            <label>Contraseña</label>
            <input id="loginPass" type="password" class="input" placeholder="Ingresa tu contraseña">
            <small style="font-size:10px;color:#6b7280;display:block;margin-top:5px">🔒 Seguridad: Mayúscula, minúscula, número y carácter especial. Máximo 3 intentos.</small>
          </div>
          
          <div id="loginError" class="alert alert-danger hidden"></div>
          
          <button class="btn btn-primary login-submit">Iniciar sesión</button>
          
          <div style="text-align: center; margin-top: 15px;">
            <a href="#" style="font-size: 12px; color: #6b7280; text-decoration: none;" onclick="event.preventDefault(); openRegisterUser(true)">Registrar usuario</a>
            <span style="margin:0 8px;color:#d1d5db">|</span>
            <a href="#" style="font-size: 12px; color: #6b7280; text-decoration: none;" onclick="event.preventDefault(); document.getElementById('modalRecuperar').style.display='grid'">¿Olvidaste tu contraseña?</a>
          </div>
        </form>
      </section>
    </div>

    <div class="modal-backdrop" id="modalRecuperar" style="display:none;">
      <div class="modal">
        <h2>Restablecer contraseña</h2>
        <p>Ingresa tu correo institucional y te enviaremos un enlace seguro para crear una nueva contraseña.</p>
        <div class="field">
          <label>Correo institucional</label>
          <input type="email" class="input" placeholder="usuario@inacap.cl">
        </div>
        <div class="actions">
          <button class="btn btn-outline" onclick="document.getElementById('modalRecuperar').style.display='none'">Cancelar</button>
          <button class="btn btn-primary" onclick="document.getElementById('modalRecuperar').style.display='none'; alert('📧 Se ha enviado un enlace de recuperación a tu correo institucional.')">Enviar enlace</button>
        </div>
      </div>
    </div>
  `;
}

function pickRole(role) {
  state.role = role;
  login();
}

// --- LÓGICA DE INGRESO ---
function doLogin(e) {
  e.preventDefault();
  const email = $("#loginUser").value;
  const pass = $("#loginPass").value;
  const errorDiv = $("#loginError");

  // 1. Validaciones de campos vacíos
  if (!email || !pass) {
    errorDiv.textContent = "⚠️ Por favor, ingresa tu correo y contraseña.";
    errorDiv.classList.remove("hidden");
    return;
  }
  if (!email.includes("@")) {
    errorDiv.textContent = "⚠️ Ingresa un correo institucional válido.";
    errorDiv.classList.remove("hidden");
    return;
  }
  if (!validarCorreoInacap(email)) {
    errorDiv.textContent = "⚠️ El correo debe terminar en @inacap.cl.";
    errorDiv.classList.remove("hidden");
    return;
  }
  if (/\s/.test(pass)) {
    errorDiv.textContent = "⚠️ La contraseña no puede contener espacios en blanco.";
    errorDiv.classList.remove("hidden");
    return;
  }

  errorDiv.classList.add("hidden");

  fetch("api.php?accion=login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: pass }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        state.logged = true;
        state.user = data.user;
        sessionStorage.setItem("biblioteca_session", JSON.stringify(data.user));
        aplicarTema();

        if (data.user.tipo === "Estudiante") state.role = "student";
        else if (data.user.tipo === "Bibliotecario") state.role = "librarian";
        else state.role = "admin";

        state.screen =
          state.role === "librarian" || state.role === "admin"
            ? "dashboard"
            : "my-loans";
        render();
      } else {
        errorDiv.textContent = data.msg;
        errorDiv.classList.remove("hidden");
      }
    })
    .catch((err) => {
      errorDiv.textContent = "Error de conexión con el servidor.";
      errorDiv.classList.remove("hidden");
    });
}

function logout() {
  state.logged = false;
  sessionStorage.removeItem("biblioteca_session");
  state.screen = "dashboard";
  login();
}
function navigate(screen) {
  state.screen = screen;
  render();
}

function layout(content) {
  // 2. Asignamos el menú según el rol
  let nav;
  if (state.role === "admin") nav = navL;
  else if (state.role === "librarian") nav = navBib;
  else nav = navS;

  let profile;
  if (state.role === "admin") profile = ["Carlos Rojas", "Administrador", "CR"];
  else if (state.role === "librarian") {
    const nombre = state.user ? state.user.nombre : "Bibliotecario";
    profile = [nombre, "Bibliotecario", initials(nombre)];
  } else {
    const nombre = state.user ? state.user.nombre : "Estudiante";
    profile = [nombre, "Estudiante", initials(nombre)];
  }

  const menuLabel =
    state.role === "librarian" || state.role === "admin"
      ? "ADMINISTRACIÓN"
      : "PORTAL ACADÉMICO";

  $("#root").innerHTML =
    `<div class="app"><aside class="sidebar"><div class="brand"><img class="logo" src="assets/logo_inacap.png" alt="INACAP"><div><strong>INACAP</strong><small>Sistema de Biblioteca</small></div></div><div class="nav-label">${menuLabel}</div><nav class="nav">${nav.map((n) => `<button class="${state.screen === n[0] ? "active" : ""}" onclick="navigate('${n[0]}')"><span class="nav-icon">${icons[n[0]]}</span>${n[1]}</button>`).join("")}</nav><div class="profile"><div class="profile-row"><div class="avatar">${profile[2]}</div><div><strong>${profile[0]}</strong><small>${profile[1]}</small></div></div><button class="theme-toggle" onclick="toggleTheme()"><span>${state.theme === "dark" ? "☀️" : "🌙"}</span><span>${state.theme === "dark" ? "Modo claro" : "Modo oscuro"}</span></button><button class="logout" onclick="logout()">Cerrar sesión</button></div></aside><main class="main"><div id="liveDate" class="live-date" aria-live="polite"></div>${content}</main></div>`;
  actualizarFechaHora();
}

function render() {
  if (!state.logged) return login();
  const pages = {
    dashboard,
    booksPage,
    loansPage,
    returnsPage,
    renewalsPage,
    finesPage,
    usersPage,
    reportsPage,
    myLoansPage,
  };
  const map = {
    dashboard: "dashboard",
    books: "booksPage",
    loans: "loansPage",
    returns: "returnsPage",
    renewals: "renewalsPage",
    fines: "finesPage",
    users: "usersPage",
    reports: "reportsPage",
    "my-loans": "myLoansPage",
  };
  layout(pages[map[state.screen]]());
}

// --- VISTAS ---
function dashboard() {
  const recent = loans.slice(0, 7);
  const fechaSistema = state.fechaSimulada
    ? new Date(state.fechaSimulada + "T12:00:00")
    : new Date();

  const fechaSistemaISO = `${fechaSistema.getFullYear()}-${String(fechaSistema.getMonth() + 1).padStart(2, "0")}-${String(fechaSistema.getDate()).padStart(2, "0")}`;
  const prestamosHoy = loans.filter((loan) => loan.start === fechaSistemaISO).length;
  const vencidosHoy = loans.filter(
    (loan) =>
      loan.status !== "returned" &&
      loan.due === fechaSistemaISO,
  ).length;
  const prestamosVencidos = loans.filter(
    (loan) =>
      loan.status === "overdue" ||
      (loan.status === "active" && loan.due < fechaSistemaISO),
  ).length;
  const multasPendientes = fines.filter((fine) => !fine.paid);
  const montoMultas = multasPendientes.reduce(
    (total, fine) => total + fine.amount,
    0,
  );
  const disponibles = books.reduce(
    (total, book) => total + book.available,
    0,
  );
  const stockTotal = books.reduce((total, book) => total + book.stock, 0);
  const stockCritico = books.filter(
    (book) => book.available <= 1,
  ).length;
  const renovacionesPendientes = loans.filter(
    (loan) => loan.status !== "returned" && loan.renewals < 1,
  ).length;
  const controlTiempo = state.role === "admin"
    ? `<section class="card pad" style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h3 style="margin:0 0 5px">Simulación de tiempo</h3><p class="sub" style="margin:0">Fecha del sistema: ${state.fechaSimulada || "Cargando..."}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-outline" onclick="simularTiempo(1)">+1 día</button><button class="btn btn-outline" onclick="simularTiempo(7)">+7 días</button><button class="btn btn-outline" onclick="simularTiempo(30)">+30 días</button><button class="btn btn-primary" onclick="reiniciarTiempo()">Reiniciar tiempo</button></div></div></section>`
    : "";
  const fechaDashboard = state.fechaSimulada
    ? new Date(state.fechaSimulada + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return `<div class="page"><div class="page-head"><div><h1>Dashboard</h1><p>${fechaDashboard}</p></div><button class="btn btn-primary" onclick="navigate('loans')">Nuevo préstamo</button></div>${controlTiempo}<div class="grid g4" style="margin-bottom:24px">${metric(prestamosHoy, "Préstamos hoy", "Registrados hoy")}${metric(vencidosHoy, "Vencen hoy", vencidosHoy ? "Requieren atención" : "Sin vencimientos hoy", "#d97706", "#fff3cd")}${metric(multasPendientes.length, "Multas activas", money(montoMultas), "#e30613", "#fee8e9")}${metric(disponibles, "Libros disponibles", `de ${stockTotal} en stock`, "#28a745", "#d4edda")}</div><div class="grid" style="grid-template-columns:2fr 1fr"><section class="card table-wrap"><div class="section-title"><h2>Préstamos recientes</h2><button class="btn btn-outline btn-sm" onclick="navigate('loans')">Ver todos</button></div><table><thead><tr><th>Usuario</th><th>Libro</th><th>Vencimiento</th><th>Estado</th></tr></thead><tbody>${recent.map((l) => `<tr><td>${userCell(l.user)}</td><td><strong>${l.book.title}</strong><div class="sub">${l.book.isbn}</div></td><td>${date(l.due)}<div class="sub">Renovaciones: ${l.renewals}</div></td><td>${statusBadge(l.status)}</td></tr>`).join("")}</tbody></table></section><div class="grid"><section class="card pad"><h3 style="margin-top:0">Acciones rápidas</h3>${[
    ["Registrar préstamo", "loans"],
    ["Registrar devolución", "returns"],
    ["Gestionar multas", "fines"],
    ["Ver reportes", "reports"],
  ]
    .map(
      (a) =>
        `<button class="btn btn-outline" style="width:100%;margin:4px 0;text-align:left" onclick="navigate('${a[1]}')">${a[0]} <span style="float:right">›</span></button>`,
    )
    .join(
      "",
    )}</section><section class="card pad"><h3 style="margin-top:0">Alertas del sistema</h3><div class="alert ${prestamosVencidos ? "alert-danger" : "alert-success"}">${prestamosVencidos} préstamos vencidos requieren atención</div><div class="alert" style="background:#fff3cd;color:#966c00">${stockCritico} títulos con stock crítico</div><div class="alert" style="background:#eff6ff;color:#2563eb;margin:0">${renovacionesPendientes} renovaciones pendientes</div></section></div></div></div>`;
}

function booksPage() {
  const q = (state.bookSearch || "").toLowerCase(),
    cat = state.bookCategory,
    av = state.bookAvailability;
  const filtered = books.filter(
    (b) =>
      (b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.includes(q)) &&
      (cat === "Todas" || b.category === cat) &&
      (av === "all" ||
        (av === "available" && b.available > 0) ||
        (av === "unavailable" && b.available === 0)),
  );
  const categorias = books
    .map((book) => book.category)
    .filter((category, index, categories) =>
      category && categories.indexOf(category) === index,
    )
    .sort((a, b) => a.localeCompare(b, "es"));
  const cats = ["Todas", ...categorias];
  const ejemplaresDisponibles = books.reduce((total, book) => total + book.available, 0);
  const ejemplaresTotales = books.reduce((total, book) => total + book.stock, 0);
  const puedeGestionarLibros = state.role === "admin" || state.role === "librarian";
  return `<div class="page"><div class="page-head"><div><h1>Catálogo de Libros</h1><p>${filtered.length} títulos encontrados</p></div><div style="display:flex;gap:10px;align-items:center"><p style="margin:0"><strong>${ejemplaresDisponibles}</strong> disponibles de <strong>${ejemplaresTotales}</strong> en stock</p>${puedeGestionarLibros ? `<button class="btn btn-primary" onclick="openAddBook()">Añadir libro</button>` : ""}</div></div><div class="card toolbar"><input id="bookSearch" class="input search" value="${state.bookSearch || ""}" oninput="updateSearch('bookSearch',this.value,'#bookSearch')" placeholder="Buscar por título, autor o ISBN..."><div class="chips">${cats.map((c) => `<button class="chip ${cat === c ? "active" : ""}" onclick="state.bookCategory='${c}';render()">${c}</button>`).join("")}</div><select class="select" onchange="state.bookAvailability=this.value;render()"><option value="all" ${av === "all" ? "selected" : ""}>Todos</option><option value="available" ${av === "available" ? "selected" : ""}>Disponibles</option><option value="unavailable" ${av === "unavailable" ? "selected" : ""}>Prestados</option></select></div><div class="grid books">${filtered.map((b) => `<article class="card book-card"><div class="cover" style="background:linear-gradient(135deg,${b.color},${b.color}99)">B<span class="badge" style="background:${b.available ? `#28a745` : `#dc3545`}">${b.available ? "Disponible" : "Prestado"}</span></div><div class="book-body"><span class="badge error">${b.category}</span><h3>${b.title}</h3><p>${b.author}</p><p>ISBN: ${b.isbn}</p><div class="book-foot"><span><strong>${b.available}</strong> disponibles · ${b.stock} stock</span><div style="display:flex;gap:5px">${b.available ? `<button class="btn btn-sm btn-outline" onclick="state.selectedBook=${b.id};navigate('loans')">Prestar</button>` : ""}${puedeGestionarLibros ? `<button class="btn btn-sm btn-primary" onclick="openEditBook(${b.id})">Editar</button>` : ""}</div></div></div></article>`).join("") || `<div class="empty">No se encontraron libros</div>`}</div></div>`;
}

function openAddBook() {
  if (state.role !== "admin" && state.role !== "librarian") return;

  const categorias = [...new Set(books.map((book) => book.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es"));

  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modalAgregarLibro">
      <div class="modal" style="max-width:520px">
        <h2>Añadir libro</h2>
        <p>El ID se genera automáticamente y disponible comenzará igual al stock.</p>
        <div class="field"><label>Título</label><input id="nuevoLibroTitulo" class="input" style="width:100%" placeholder="Título del libro"></div>
        <div class="field"><label>Autor</label><input id="nuevoLibroAutor" class="input" style="width:100%" placeholder="Nombre del autor"></div>
        <div class="field"><label>ISBN</label><input id="nuevoLibroIsbn" class="input" style="width:100%" placeholder=""></div>
        <div class="field"><label>Stock</label><input id="nuevoLibroStock" type="number" min="1" step="1" class="input" style="width:100%" value="1"></div>
        <div class="field"><label>Categoría existente</label><select id="nuevoLibroCategoria" class="select" style="width:100%"><option value="">Sin categoría</option>${categorias.map((category) => `<option>${category}</option>`).join("")}</select></div>
        <div class="field"><label>Nueva categoría <span class="sub">(opcional)</span></label><input id="nuevoLibroCategoriaNueva" class="input" style="width:100%" placeholder="Ej: Psicología"></div>
        <div id="agregarLibroError" class="alert alert-danger hidden"></div>
        <div class="actions">
          <button class="btn btn-outline" onclick="$('#modalAgregarLibro').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="addBook()">Guardar libro</button>
        </div>
      </div>
    </div>`,
  );
}

function openEditBook(id) {
  if (state.role !== "admin" && state.role !== "librarian") return;

  const book = books.find((item) => item.id === id);
  if (!book) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modalEditarLibro">
      <div class="modal" style="max-width:520px">
        <h2>Editar libro</h2>
        <p>Solo se puede modificar el stock. Los demás datos permanecen sin cambios.</p>
        <div class="field"><label>Título</label><input class="input" style="width:100%" value="${book.title}" readonly></div>
        <div class="field"><label>ISBN</label><input class="input" style="width:100%" value="${book.isbn}" readonly></div>
        <div class="field"><label>Autor</label><input class="input" style="width:100%" value="${book.author}" readonly></div>
        <div class="field"><label>Categoría</label><input class="input" style="width:100%" value="${book.category || "Sin categoría"}" readonly></div>
        <div class="field"><label>Stock total</label><input id="editarLibroStock" type="number" min="1" step="1" class="input" style="width:100%" value="${book.stock}"></div>
        <div id="editarLibroError" class="alert alert-danger hidden"></div>
        <div class="actions">
          <button class="btn btn-outline" onclick="$('#modalEditarLibro').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="updateBook(${id})">Guardar cambios</button>
        </div>
      </div>
    </div>`,
  );
}

function updateBook(id) {
  const stock = Number.parseInt($("#editarLibroStock").value, 10);
  const errorDiv = $("#editarLibroError");

  if (!Number.isInteger(stock) || stock < 1) {
    errorDiv.textContent = "⚠️ Ingresa un stock válido mayor o igual a 1.";
    errorDiv.classList.remove("hidden");
    return;
  }

  fetch("api.php?accion=editar_libro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      stock,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        errorDiv.textContent = data.msg || "No fue posible actualizar el libro.";
        errorDiv.classList.remove("hidden");
        return;
      }

      $("#modalEditarLibro").remove();
      toast("Libro actualizado correctamente.");
      cargarDatosYRenderizar(false);
    })
    .catch(() => {
      errorDiv.textContent = "Error de conexión con el servidor.";
      errorDiv.classList.remove("hidden");
    });
}

function addBook() {
  const titulo = $("#nuevoLibroTitulo").value.trim();
  const autor = $("#nuevoLibroAutor").value.trim();
  const isbn = $("#nuevoLibroIsbn").value.trim();
  const stock = Number.parseInt($("#nuevoLibroStock").value, 10);
  const categoriaExistente = $("#nuevoLibroCategoria").value.trim();
  const categoriaNueva = $("#nuevoLibroCategoriaNueva").value.trim();
  const categoria = categoriaNueva || categoriaExistente || "";
  const errorDiv = $("#agregarLibroError");

  if (!titulo || !autor || !isbn || !Number.isInteger(stock) || stock < 1) {
    errorDiv.textContent = "⚠️ Título, autor, ISBN y stock válido son obligatorios.";
    errorDiv.classList.remove("hidden");
    return;
  }

  if (!validarIsbn(isbn)) {
    errorDiv.textContent = "⚠️ Ingresa un ISBN-10 o ISBN-13 válido.";
    errorDiv.classList.remove("hidden");
    return;
  }

  errorDiv.classList.add("hidden");

  fetch("api.php?accion=registrar_libro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo,
      autor,
      isbn,
      categoria,
      stock,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        errorDiv.textContent = data.msg || "No fue posible registrar el libro.";
        errorDiv.classList.remove("hidden");
        return;
      }

      $("#modalAgregarLibro").remove();
      toast("Libro registrado correctamente.");
      cargarDatosYRenderizar(false);
    })
    .catch(() => {
      errorDiv.textContent = "Error de conexión con el servidor.";
      errorDiv.classList.remove("hidden");
    });
}

function loansPage() {
  const u = users.find((x) => x.id === state.selectedUser),
    b = books.find((x) => x.id === state.selectedBook),
    uq = (state.userSearch || "").toLowerCase(),
    bq = (state.loanBookSearch || "").toLowerCase();
  const userResults = uq
    ? users
        .filter((x) => x.name.toLowerCase().includes(uq) || x.rut.includes(uq))
        .slice(0, 5)
    : [];
  const bookResults = bq
    ? books
        .filter(
          (x) =>
            x.available > 0 &&
            (x.title.toLowerCase().includes(bq) ||
              x.author.toLowerCase().includes(bq) ||
              x.isbn.includes(bq)),
        )
        .slice(0, 5)
    : [];
  const days = u?.type === "Docente" ? 30 : 14,
    due = new Date();
  due.setDate(due.getDate() + days);
  return `<div class="page" style="max-width:1100px"><div class="page-head"><div><h1>Registro de Préstamo</h1><p>Completa los datos para registrar un nuevo préstamo</p></div></div><div class="grid g2"><section class="card pad"><div class="form-title"><span style="color:var(--red)">●</span> Buscar usuario</div><input id="loanUserSearch" class="input" style="width:100%" value="${state.userSearch || u?.name || ""}" oninput="state.selectedUser=null;updateSearch('userSearch',this.value,'#loanUserSearch')" placeholder="Nombre o RUT del usuario...">${userResults.length ? `<div class="result-list">${userResults.map((x) => `<button class="result" onclick="selectUser(${x.id})">${userCell(x)}${x.debt ? `<span class="badge error" style="margin-left:auto">Deuda</span>` : ""}</button>`).join("")}</div>` : ""}${u ? `<div class="selected ${u.debt ? "blocked" : ""}"><h4>${u.name}</h4><p>${u.rut} · ${u.type}</p><p>${u.area}</p><p>${u.email}</p><span class="badge ${u.debt ? "error" : "success"}">${u.debt ? "Bloqueado por deuda" : "Habilitado"}</span></div><div class="selected"><h4>Período de préstamo</h4><p>Duración: ${days} días</p><p>Fecha de devolución: ${due.toLocaleDateString("es-CL")}</p></div>` : ""}</section><section class="card pad"><div class="form-title"><span style="color:var(--red)">■</span> Buscar libro</div><input id="loanBookSearch" class="input" style="width:100%" value="${state.loanBookSearch || b?.title || ""}" oninput="state.selectedBook=null;updateSearch('loanBookSearch',this.value,'#loanBookSearch')" placeholder="Título, autor o ISBN...">${bookResults.length ? `<div class="result-list">${bookResults.map((x) => `<button class="result" onclick="selectBook(${x.id})"><div style="width:28px;height:38px;background:${x.color};border-radius:4px"></div><div><strong>${x.title}</strong><div class="sub">${x.author}</div></div><span class="badge success" style="margin-left:auto">${x.available} disp.</span></button>`).join("")}</div>` : ""}${b ? `<div class="selected"><h4>${b.title}</h4><p>${b.author}</p><p>${b.category} · ISBN ${b.isbn}</p><span class="badge success">${b.available} disponibles</span></div>` : `<div class="empty" style="padding:35px">Busca un libro disponible</div>`}${u && b ? `<div class="selected"><h4>Resumen</h4><p>Usuario: ${u.name}</p><p>Libro: ${b.title}</p><p>Duración: ${days} días</p></div>` : ""}</section></div><div class="actions"><button class="btn btn-outline" onclick="clearLoan()">Cancelar</button><button class="btn btn-primary" ${!u || !b || u.debt ? "disabled" : ""} onclick="registerLoan()">${!u || !b ? "Selecciona usuario y libro" : u.debt ? "Usuario bloqueado" : "Registrar préstamo"}</button></div></div>`;
}

function selectUser(id) {
  state.selectedUser = id;
  state.userSearch = "";
  render();
}
function selectBook(id) {
  state.selectedBook = id;
  state.loanBookSearch = "";
  render();
}
function clearLoan() {
  state.selectedUser = null;
  state.selectedBook = null;
  state.userSearch = "";
  state.loanBookSearch = "";
  render();
}

function registerLoan() {
  const u = users.find((x) => x.id === state.selectedUser),
    b = books.find((x) => x.id === state.selectedBook);
  if (!u || !b || u.debt || b.available <= 0) return;
  const start = new Date(),
    due = new Date();
  due.setDate(due.getDate() + (u.type === "Docente" ? 30 : 14));

  fetch("api.php?accion=prestamo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario_id: u.id, libro_id: b.id }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        toast(data.msg || "Error");
        return;
      }
      // Actualizamos el stock localmente y sincronizamos con MySQL
      b.available--;
      toast("Préstamo registrado. Actualizando stock...");
      cargarDatosYRenderizar(false);
    })
    .catch((err) => {
      toast("Error de conexión");
    });
}

function returnsPage() {
  const q = (state.returnSearch || "").toLowerCase(),
    active = loans.filter(
      (l) =>
        l.status !== "returned" &&
        !state.returned.includes(l.id) &&
        (l.user.name.toLowerCase().includes(q) ||
          l.user.rut.includes(q) ||
          l.book.title.toLowerCase().includes(q)),
    );
  return `<div class="page" style="max-width:1050px"><div class="page-head"><div><h1>Devoluciones</h1><p>Registra la devolución de libros prestados</p></div></div><div class="card toolbar"><input id="returnSearch" class="input search" value="${state.returnSearch || ""}" oninput="updateSearch('returnSearch',this.value,'#returnSearch')" placeholder="Buscar por usuario, RUT o título..."></div>${state.returned.length ? `<div class="alert alert-success">${state.returned.length} devoluciones registradas en esta sesión</div>` : ""}<section class="card table-wrap"><div class="section-title"><h2>Préstamos activos</h2><span class="sub">${active.length} préstamos</span></div><table><thead><tr><th>Usuario</th><th>Libro</th><th>Vencimiento</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${active.map((l) => `<tr><td>${userCell(l.user)}</td><td><strong>${l.book.title}</strong><div class="sub">${l.book.author}</div></td><td>${date(l.due)}</td><td>${statusBadge(l.status)}</td><td><button class="btn btn-blue btn-sm" onclick="returnBook(${l.id})">Devolver</button></td></tr>`).join("")}</tbody></table>${!active.length ? `<div class="empty">No hay préstamos activos</div>` : ""}</section></div>`;
}

function returnBook(id) {
  const l = loans.find((x) => x.id === id);
  if (!l || l.status === "returned") return;

  fetch("api.php?accion=devolver", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prestamo_id: l.id, libro_id: l.book.id }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        toast(data.msg || "Error");
        return;
      }
      l.status = "returned";
      l.book.available++;
      l.user.loans = Math.max(0, l.user.loans - 1);
      state.returned.push(id);
      toast("Devolución registrada. Actualizando stock...");
      cargarDatosYRenderizar(false);
    })
    .catch((err) => {
      toast("Error de conexión");
    });
}

function renewalsPage() {
  const eligible = loans.filter(
      (l) => l.status !== "returned" && l.renewals < 1 && !l.user.debt,
    ),
    blocked = loans.filter(
      (l) => l.status !== "returned" && (l.renewals >= 1 || l.user.debt),
    );
  return `<div class="page" style="max-width:1050px"><div class="page-head"><div><h1>Renovaciones</h1><p>Gestiona las solicitudes de renovación de préstamos</p></div></div><div class="grid g3" style="margin-bottom:22px">${metric(eligible.length, "Elegibles", "Para renovar", "#28a745", "#d4edda")}${metric(state.renewed.length, "Renovadas", "En esta sesión")}${metric(blocked.length, "No elegibles", "Con restricciones", "#dc3545", "#f8d7da")}</div><section class="card table-wrap" style="margin-bottom:20px"><div class="section-title"><h2>Elegibles para renovación</h2></div><table><thead><tr><th>Usuario</th><th>Libro</th><th>Vence</th><th>Extensión</th><th>Acción</th></tr></thead><tbody>${eligible.map((l) => `<tr><td>${userCell(l.user)}</td><td>${l.book.title}</td><td>${date(l.due)}</td><td><span class="badge success">+${l.user.type === "Docente" ? 30 : 14} días</span></td><td>${state.renewed.includes(l.id) ? `<span class="badge success">Renovado</span>` : `<button class="btn btn-primary btn-sm" onclick="renew(${l.id})">Renovar</button>`}</td></tr>`).join("")}</tbody></table></section><section class="card table-wrap"><div class="section-title"><h2>No elegibles</h2></div><table><thead><tr><th>Usuario</th><th>Libro</th><th>Motivo</th></tr></thead><tbody>${blocked.map((l) => `<tr><td>${userCell(l.user)}</td><td>${l.book.title}</td><td>${l.renewals ? `<span class="badge error">Máximo alcanzado</span>` : ""}${l.user.debt ? `<span class="badge warning">Multas pendientes</span>` : ""}</td></tr>`).join("")}</tbody></table></section></div>`;
}

function renew(id) {
  const l = loans.find((x) => x.id === id);
  const d = new Date(l.due + "T12:00:00");
  d.setDate(d.getDate() + (l.user.type === "Docente" ? 30 : 14));
  l.due = d.toISOString().slice(0, 10);
  l.renewals++;
  state.renewed.push(id);
  render();
  toast("Préstamo renovado");
}

function finesPage() {
  const unpaid = fines.filter((f) => !f.paid),
    paid = fines.filter((f) => f.paid),
    total = unpaid.reduce((s, f) => s + f.amount, 0);
  return `<div class="page" style="max-width:1150px"><div class="page-head"><div><h1>Gestión de Multas</h1><p>Control y cobro de multas por devolución tardía · $500/día</p></div></div><div class="grid g4" style="margin-bottom:22px">${metric(unpaid.length, "Pendientes", "Sin pagar", "#dc3545", "#f8d7da")}${metric(unpaid.length, "Bloqueados", "Usuarios", "#e30613", "#fee8e9")}${metric(money(total), "Por cobrar", "Total", "#d97706", "#fff3cd")}${metric(paid.length, "Cobradas", "Registradas", "#28a745", "#d4edda")}</div><section class="card table-wrap"><div class="section-title"><h2>Multas pendientes</h2><span class="badge error">${unpaid.length} sin pagar</span></div><table><thead><tr><th>#</th><th>Usuario</th><th>Libro</th><th>Retraso</th><th>Monto</th><th>Acción</th></tr></thead><tbody>${unpaid.map((f) => `<tr><td>#${String(f.id).padStart(4, "0")}</td><td>${userCell(f.user)}</td><td>${f.loan.book.title}</td><td><span class="badge error">${f.days} días</span></td><td><strong style="color:var(--danger)">${money(f.amount)}</strong></td><td><button class="btn btn-primary btn-sm" onclick="paymentModal(${f.id})">Registrar pago</button></td></tr>`).join("")}</tbody></table></section>${paid.length ? `<section class="card table-wrap" style="margin-top:20px"><div class="section-title"><h2>Multas cobradas</h2><span class="badge success">${paid.length} pagadas</span></div><table><tbody>${paid.map((f) => `<tr><td>#${String(f.id).padStart(4, "0")}</td><td>${userCell(f.user)}</td><td>${f.loan.book.title}</td><td>${money(f.amount)}</td><td><span class="badge success">Pagado</span></td></tr>`).join("")}</tbody></table></section>` : ""}</div>`;
}

function paymentModal(id) {
  const f = fines.find((x) => x.id === id);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modal"><div class="modal"><h2>Registrar pago de multa</h2><p>ID #${String(f.id).padStart(4, "0")}</p><div class="selected"><h4>${f.user.name}</h4><p>${f.user.rut} · ${f.loan.book.title}</p><p>${f.days} días de retraso</p></div><div class="summary-row" style="background:#f8d7da;color:#dc3545;font-size:16px;font-weight:800"><span>Total a pagar</span><span>${money(f.amount)}</span></div><div class="field"><label>Método de pago</label><select class="select" style="width:100%"><option>Efectivo</option><option>Transferencia</option></select></div><div class="actions"><button class="btn btn-outline" onclick="$('#modal').remove()">Cancelar</button><button class="btn btn-primary" onclick="payFine(${f.id})">Confirmar pago</button></div></div></div>`,
  );
}

function payFine(id) {
  const f = fines.find((x) => x.id === id);
  if (!f) return;

  if (f.simulated) {
    fetch("api.php?accion=pagar_multa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ multa_id: f.db_id }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          toast(data.msg || "No fue posible registrar el pago");
          return;
        }

        f.paid = true;
        f.user.debt = false;
        $("#modal").remove();
        toast(data.msg);
        cargarDatosYRenderizar(false);
      })
      .catch(() => toast("Error de conexión al registrar el pago"));
  } else {
    f.paid = true;
    f.user.debt = fines.some((x) => x.user.id === f.user.id && !x.paid);
    $("#modal").remove();
    render();
    toast("Pago registrado y usuario actualizado");
  }
}

function usersPage() {
  const q = (state.userTableSearch || "").toLowerCase(),
    filtered = users.filter(
      (u) =>
        ((u.nombre || u.name || "").toLowerCase().includes(q) ||
          u.rut.includes(q) ||
          (u.email || "").toLowerCase().includes(q)) &&
        (state.userFilter === "all" || (u.tipo || u.type) === state.userFilter),
    );

  // Función auxiliar para saber si está bloqueado (por deuda o por intentos)
  const estaBloqueado = (u) => u.debt == 1 || u.intentos_fallidos >= 3;

  return `<div class="page" style="max-width:1100px">
    <div class="page-head">
      <div>
        <h1>Gestión de Usuarios</h1>
        <p>Administra los usuarios y restablece contraseñas</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="openRegisterUser()">Registrar usuario</button>
        <button class="btn btn-primary" onclick="alert('🔐 Se ha enviado un enlace seguro de restablecimiento de contraseña.')">Restablecer Contraseña</button>
      </div>
    </div>
    
    <div class="grid g3" style="margin-bottom:20px">
      ${metric(users.length, "Total usuarios", "Registrados")}
      ${metric(users.filter((u) => (u.tipo || u.type) === "Estudiante").length, "Estudiantes", "Activos", "#28a745", "#d4edda")}
      ${metric(users.filter((u) => estaBloqueado(u)).length, "Bloqueados", "Con deuda o intentos", "#dc3545", "#f8d7da")}
    </div>
    
    <div class="card toolbar">
      <input id="userTableSearch" class="input search" value="${state.userTableSearch || ""}" oninput="updateSearch('userTableSearch',this.value,'#userTableSearch')" placeholder="Nombre, RUT o email...">
    </div>
    
    <section class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>Usuario</th><th>RUT</th><th>Tipo</th><th>Carrera / Dpto.</th><th>Préstamos</th><th>Estado</th><th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((u) => {
              const bloqueado = estaBloqueado(u);
              const nombreMostrar = u.nombre || u.name;
              const tipoMostrar = u.tipo || u.type;

              return `
            <tr>
              <td>${userCell(u)}</td>
              <td>${u.rut}</td>
              <td><span class="badge info">${tipoMostrar}</span></td>
              <td>${u.area}</td>
              <td><strong>${u.loans || 0}</strong> activos</td>
              <td><span class="badge ${bloqueado ? "error" : "success"}">${bloqueado ? "Bloqueado" : "Habilitado"}</span></td>
              <td style="display:flex; gap:5px;">
                <button class="btn btn-sm btn-outline" onclick="openEditUser(${u.id})">Editar</button>
                ${
                  bloqueado
                    ? `<button class="btn btn-sm" style="background:#28a745;color:white;border:none" onclick="toggleBlock(${u.id})">Desbloquear</button>`
                    : `<button class="btn btn-sm" style="background:#dc3545;color:white;border:none" onclick="toggleBlock(${u.id})">Bloquear</button>`
                }
              </td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>
      ${!filtered.length ? `<div class="empty">No se encontraron usuarios</div>` : ""}
    </section>
  </div>`;
}

function openRegisterUser(registroPublico = false) {
  const tipoUsuario = registroPublico
    ? `<input type="hidden" id="nuevoTipo" value="Estudiante">`
    : `<div class="field"><label>Tipo de usuario</label><select id="nuevoTipo" class="select" style="width:100%"><option>Estudiante</option><option>Bibliotecario</option><option>Administrador</option></select></div>`;

  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modalRegistrarUsuario">
      <div class="modal" style="max-width:520px">
        <h2>Registrar usuario</h2>
        <p>Los datos se guardarán en la base de datos.</p>
        <div class="field"><label>Nombre completo</label><input id="nuevoNombre" class="input" style="width:100%" placeholder="Nombre y apellidos"></div>
        <div class="field"><label>RUT</label><input id="nuevoRut" class="input" style="width:100%" placeholder="12.345.678-9"></div>
        ${tipoUsuario}
        <div class="field"><label>Área o carrera</label><input id="nuevaArea" class="input" style="width:100%" placeholder="Área, departamento o carrera"></div>
        <div class="field"><label>Correo institucional</label><input id="nuevoEmail" type="email" class="input" style="width:100%" placeholder="usuario@inacap.cl"></div>
        <div class="field"><label>Contraseña</label><input id="nuevaPassword" type="password" class="input" style="width:100%" placeholder="Ejemplo: Segura#2026"><small style="font-size:10px;color:#6b7280;display:block;margin-top:5px">🔒 Seguridad: mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.</small></div>
        <div id="registroUsuarioError" class="alert alert-danger hidden"></div>
        <div class="actions">
          <button class="btn btn-outline" onclick="$('#modalRegistrarUsuario').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="registerUser()">Guardar usuario</button>
        </div>
      </div>
    </div>`,
  );
}

function registerUser() {
  const nombre = $("#nuevoNombre").value.trim();
  const rut = $("#nuevoRut").value.trim();
  const tipoInput = $("#nuevoTipo");
  const tipo = tipoInput ? tipoInput.value : "Estudiante";
  const area = $("#nuevaArea").value.trim();
  const email = $("#nuevoEmail").value;
  const password = $("#nuevaPassword").value;
  const errorDiv = $("#registroUsuarioError");

  if (!nombre || !rut || !tipo || !area || !email || !password) {
    errorDiv.textContent = "⚠️ Completa todos los campos.";
    errorDiv.classList.remove("hidden");
    return;
  }

  if (!validarRutChileno(rut)) {
    errorDiv.textContent = "⚠️ El RUT ingresado no es válido.";
    errorDiv.classList.remove("hidden");
    return;
  }

  if (!validarCorreoInacap(email)) {
    errorDiv.textContent = "⚠️ El correo debe terminar en @inacap.cl.";
    errorDiv.classList.remove("hidden");
    return;
  }

  const errorPassword = validarPasswordSegura(password);
  if (errorPassword) {
    errorDiv.textContent = `⚠️ ${errorPassword}`;
    errorDiv.classList.remove("hidden");
    return;
  }

  errorDiv.classList.add("hidden");

  fetch("api.php?accion=registrar_usuario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombre,
      rut,
      tipo,
      area,
      email,
      password,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        errorDiv.textContent = data.msg || "No fue posible registrar el usuario.";
        errorDiv.classList.remove("hidden");
        return;
      }

      $("#modalRegistrarUsuario").remove();
      toast("Usuario registrado correctamente.");
      cargarDatosYRenderizar(false);
    })
    .catch(() => {
      errorDiv.textContent = "Error de conexión con el servidor.";
      errorDiv.classList.remove("hidden");
    });
}

function openEditUser(id) {
  const u = users.find((x) => x.id === id);
  if (!u) return;

  const nombre = u.name || u.nombre || "";
  const rut = u.rut || "";
  const tipo = u.type || u.tipo || "Estudiante";
  const area = u.area || "";
  const email = u.email || "";

  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modalEditarUsuario">
      <div class="modal" style="max-width:520px">
        <h2>Editar usuario</h2>
        <p>RUT y nombre no se pueden modificar.</p>
        <div class="field"><label>Nombre completo</label><input class="input" style="width:100%" value="${nombre}" readonly></div>
        <div class="field"><label>RUT</label><input class="input" style="width:100%" value="${rut}" readonly></div>
        <div class="field"><label>Tipo de usuario</label><select id="editarTipo" class="select" style="width:100%"><option ${tipo === "Estudiante" ? "selected" : ""}>Estudiante</option><option ${tipo === "Bibliotecario" ? "selected" : ""}>Bibliotecario</option><option ${tipo === "Administrador" ? "selected" : ""}>Administrador</option></select></div>
        <div class="field"><label>Área o carrera</label><input id="editarArea" class="input" style="width:100%" value="${area}"></div>
        <div class="field"><label>Correo institucional</label><input id="editarEmail" type="email" class="input" style="width:100%" value="${email}"></div>
        <div class="field"><label>Nueva contraseña</label><input id="editarPassword" type="password" class="input" style="width:100%" placeholder="Dejar vacío para conservarla"><small style="font-size:10px;color:#6b7280;display:block;margin-top:5px">🔒 Si se cambia: mínimo 8 caracteres, mayúscula, minúscula, número y carácter especial.</small></div>
        <div id="editarUsuarioError" class="alert alert-danger hidden"></div>
        <div class="actions">
          <button class="btn btn-outline" onclick="$('#modalEditarUsuario').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="updateUser(${id})">Guardar cambios</button>
        </div>
      </div>
    </div>`,
  );
}

function updateUser(id) {
  const tipo = $("#editarTipo").value;
  const area = $("#editarArea").value.trim();
  const email = $("#editarEmail").value;
  const password = $("#editarPassword").value;
  const errorDiv = $("#editarUsuarioError");

  if (!tipo || !area || !email) {
    errorDiv.textContent = "⚠️ Tipo, área y correo son obligatorios.";
    errorDiv.classList.remove("hidden");
    return;
  }

  if (!validarCorreoInacap(email)) {
    errorDiv.textContent = "⚠️ El correo debe terminar en @inacap.cl.";
    errorDiv.classList.remove("hidden");
    return;
  }

  if (password) {
    const errorPassword = validarPasswordSegura(password);
    if (errorPassword) {
      errorDiv.textContent = `⚠️ ${errorPassword}`;
      errorDiv.classList.remove("hidden");
      return;
    }
  }

  errorDiv.classList.add("hidden");

  fetch("api.php?accion=editar_usuario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      tipo,
      area,
      email,
      password,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        errorDiv.textContent = data.msg || "No fue posible actualizar el usuario.";
        errorDiv.classList.remove("hidden");
        return;
      }

      $("#modalEditarUsuario").remove();
      toast("Usuario actualizado correctamente.");
      cargarDatosYRenderizar(false);
    })
    .catch(() => {
      errorDiv.textContent = "Error de conexión con el servidor.";
      errorDiv.classList.remove("hidden");
    });
}

function reportsPage() {
  const reporte = state.report;
  if (!reporte) {
    return `<div class="page"><h1>Reportes</h1><div class="alert alert-danger">No fue posible cargar los datos reales.</div></div>`;
  }

  const total = reporte.total_prestamos;
  const devoluciones = reporte.total_devoluciones;
  const tasa = total ? Math.round((devoluciones / total) * 100) : 0;
  const mensual = reporte.mensual;
  const maxPrestamos = Math.max(
    1,
    ...mensual.map((item) => item.prestamos),
  );
  const maxDevoluciones = Math.max(
    1,
    ...mensual.map((item) => item.devoluciones),
  );
  const maxGrafico = Math.max(maxPrestamos, maxDevoluciones);
  const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const maxTop = Math.max(
    1,
    ...reporte.top_libros.map((item) => item.cantidad),
  );

  return `<div class="page"><div class="page-head"><div><h1>Reportes</h1><p>Análisis estadístico con datos reales de MySQL</p></div></div><div class="grid g4" style="margin-bottom:22px">${metric(total.toLocaleString("es-CL"), "Total préstamos", "Todos los registros")}${metric(devoluciones.toLocaleString("es-CL"), "Devoluciones", `${tasa}% tasa`, "#28a745", "#d4edda")}${metric(reporte.usuarios_unicos.toLocaleString("es-CL"), "Usuarios únicos", "Con préstamos", "#8b5cf6", "#ede9fe")}${metric(money(reporte.monto_multas), "Multas generadas", `${reporte.total_multas} registros`, "#dc3545", "#f8d7da")}</div><section class="card pad" style="margin-bottom:22px"><h3>Préstamos y devoluciones por mes</h3><p class="sub">Datos reales de todos los meses registrados</p><div class="chart">${mensual.map((item) => `<div class="chart-group"><div class="chart-bar" style="height:${(item.prestamos / maxGrafico) * 100}%;background:#e30613"></div><div class="chart-bar" style="height:${(item.devoluciones / maxGrafico) * 100}%;background:#3b82f6"></div><label>${nombresMeses[item.mes - 1]}</label></div>`).join("")}</div><div class="chart-legend"><span class="dot" style="background:#e30613"></span>Préstamos <span class="dot" style="background:#3b82f6"></span>Devoluciones</div></section><div class="grid" style="grid-template-columns:3fr 2fr"><section class="card pad"><h3>Top libros más prestados</h3>${reporte.top_libros.map((item, i) => `<div class="bar-row"><div class="rank">${i + 1}</div><div class="bar-info"><div class="bar-label"><span>${item.titulo}</span><strong>${item.cantidad}</strong></div><div class="bar"><span style="width:${(item.cantidad / maxTop) * 100}%"></span></div></div></div>`).join("") || `<div class="empty">No hay préstamos registrados</div>`}</section><section class="card pad"><h3>Usuarios con multas</h3>${reporte.usuarios_multas.map((item) => `<div class="summary-row"><div>${item.nombre}<div class="sub">${item.rut}</div></div><strong style="color:var(--danger)">${money(item.monto)}</strong></div>`).join("") || `<div class="empty">No hay multas registradas</div>`}<button class="btn btn-outline" style="width:100%;margin-top:10px" onclick="exportReport()">Exportar reporte</button></section></div></div>`;
}

function exportReport() {
  const reporte = state.report;
  if (!reporte) return;
  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "May", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const rows = [
      "Mes,Prestamos,Devoluciones",
      ...reporte.mensual.map((item) =>
        `${nombresMeses[item.mes - 1]},${item.prestamos},${item.devoluciones}`,
      ),
    ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
  a.download = "reporte-biblioteca-2026.csv";
  a.click();
  toast("Reporte exportado");
}

function myLoansPage() {
  const mine = loans.filter(
      (l) =>
        l.user &&
        l.user.id === state.user.id &&
        l.status !== "returned",
    ),
    history = loans
      .filter(
        (l) =>
          l.status === "returned" &&
          l.user &&
          l.user.id === state.user.id,
      )
      .slice(0, 3);
  return `<div class="page" style="max-width:1100px"><div class="page-head"><div><h1>Mis Préstamos</h1><p>Hola, <strong>${state.user.nombre}</strong> — Gestiona tus préstamos activos</p></div></div><div class="grid g4" style="margin-bottom:22px">${metric(mine.length, "Activos", "Préstamos")}${metric(mine.filter((l) => l.status === "active").length, "A tiempo", "Sin retraso", "#28a745", "#d4edda")}${metric(0, "Por vencer", "≤3 días", "#d97706", "#fff3cd")}${metric(mine.filter((l) => l.status === "overdue").length, "Atrasados", "Generan multa", "#dc3545", "#f8d7da")}</div>${mine.some((l) => l.status === "overdue") ? `<div class="alert alert-danger">Tienes préstamos atrasados. Se generan multas de $500 por día de retraso.</div>` : ""}<h3>Préstamos activos</h3><div class="grid g3" style="margin-bottom:25px">${mine.map((l) => `<article class="card loan-card ${l.status === "overdue" ? "overdue" : ""}"><div class="loan-strip" style="background:${l.book.color}"></div><div class="loan-content"><h3>${l.book.title}</h3><p>${l.book.author}</p><p>${l.book.category}</p><div class="loan-dates"><div class="date-row"><span>Préstamo</span><strong>${date(l.start)}</strong></div><div class="date-row"><span>Devolución</span><strong>${date(l.due)}</strong></div></div>${statusBadge(l.status)}<button class="btn btn-outline" style="width:100%;margin-top:12px" ${l.renewals || l.user.debt ? "disabled" : ""} onclick="studentRenew(${l.id})">${l.renewals ? "Sin renovaciones disponibles" : l.user.debt ? "Bloqueado por multa" : "Renovar préstamo"}</button></div></article>`).join("")}</div><h3>Historial de devoluciones</h3><section class="card table-wrap"><table><thead><tr><th>Libro</th><th>Préstamo</th><th>Estado</th></tr></thead><tbody>${history.map((l) => `<tr><td><strong>${l.book.title}</strong><div class="sub">${l.book.author}</div></td><td>${date(l.start)}</td><td><span class="badge neutral">Devuelto</span></td></tr>`).join("")}</tbody></table></section></div>`;
}

function studentRenew(id) {
  const l = loans.find((x) => x.id === id),
    days = l.user.type === "Docente" ? 30 : 14;
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal-backdrop" id="modal"><div class="modal"><h2>Renovar préstamo</h2><p>${l.book.title}</p><div class="summary-row"><span>Vencimiento actual</span><strong>${date(l.due)}</strong></div><div class="summary-row" style="background:#d4edda;color:#28a745"><span>Extensión</span><strong>+${days} días</strong></div><div class="actions"><button class="btn btn-outline" onclick="$('#modal').remove()">Cancelar</button><button class="btn btn-primary" onclick="$('#modal').remove();renew(${id})">Confirmar renovación</button></div></div></div>`,
  );
}

// Función para Bloquear / Desbloquear usuarios (Conectada a MySQL)
function toggleBlock(id) {
  const u = users.find((x) => x.id === id);
  if (!u) return;

  fetch("api.php?accion=toggle_block", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        if (data.nuevo_estado === 0) {
          u.debt = 0;
          u.intentos_fallidos = 0;
        } else {
          u.debt = 1;
        }
        render();
        toast(
          data.nuevo_estado === 0
            ? `🔓 Usuario desbloqueado`
            : `🔒 Usuario bloqueado`,
        );
      }
    });
}

async function cargarDatosYRenderizar(mostrarLogin = true) {
  try {
    const response = await fetch("api.php?accion=obtener_datos");
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.msg || "No fue posible cargar los datos");
    }

    users.splice(
      0,
      users.length,
      ...data.users
    );

    books.splice(
      0,
      books.length,
      ...data.books
    );

    loans.splice(
      0,
      loans.length,
      ...data.loans.map((loan) => ({
        id: loan.id,
        user: users.find((user) => user.id === loan.user_id),
        book: books.find((book) => book.id === loan.book_id),
        start: loan.start,
        due: loan.due,
        status: loan.status,
        renewals: loan.renewals
      })).filter((loan) => loan.user && loan.book)
    );

    fines = [];
    (data.simulated_fines || []).forEach((fine) => {
      const loan = loans.find((item) => item.id === fine.prestamo_id);
      const user = users.find((item) => item.id === fine.usuario_id);
      if (!loan || !user) return;

      fines.push({
        id: fine.id + 10000,
        db_id: fine.id,
        user,
        loan,
        days: fine.dias,
        amount: fine.amount,
        paid: fine.paid,
        simulated: true,
      });
    });

    state.report = data.report || null;

    users.forEach((user) => {
      user.loans = loans.filter(
        (loan) =>
          loan.user &&
          loan.user.id === user.id &&
          loan.status !== "returned"
      ).length;
    });

    if (mostrarLogin) {
      const savedUser = sessionStorage.getItem("biblioteca_session");
      if (savedUser) {
        state.logged = true;
        state.user = JSON.parse(savedUser);

        if (state.user.tipo === "Estudiante") state.role = "student";
        else if (state.user.tipo === "Bibliotecario") state.role = "librarian";
        else state.role = "admin";

        state.screen =
          state.role === "librarian" || state.role === "admin"
            ? "dashboard"
            : "my-loans";
        render();
      } else {
        login();
      }
    } else if (state.logged) {
      render();
    } else {
      login();
    }
  } catch (error) {
    document.getElementById("root").innerHTML =
      `<div class="alert alert-danger">${error.message}</div>`;
  }
}
// Iniciar la aplicación
cargarDatosYRenderizar();
aplicarTema();
cargarTiempoSistema();

actualizarFechaHora();
setInterval(actualizarFechaHora, 1000);
