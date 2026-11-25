// Reglas de contraseña segura exigidas por el profesor
function validarPasswordSegura(password) {
  if (!password || password.length < 8) return "Debe tener al menos 8 caracteres.";
  if (/\s/.test(password)) return "No debe contener espacios en blanco.";
  if (!/[A-Z]/.test(password)) return "Debe tener al menos una mayúscula.";
  if (!/[a-z]/.test(password)) return "Debe tener al menos una minúscula.";
  if (!/[0-9]/.test(password)) return "Debe tener al menos un número.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Debe tener al menos un carácter especial (ej: @, #, $, !, %).";

  const patronesComunes = ["1234", "qwerty", "admin", "password", "inacap", "chile", "clave"];
  if (patronesComunes.some((p) => password.toLowerCase().includes(p))) {
    return "La contraseña es muy común o contiene palabras no permitidas.";
  }
  return null; // Retorna null si es segura
}

function validarRutChileno(rutCompleto) {
  const limpio = String(rutCompleto).replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length < 2) return false;

  const cuerpo = limpio.slice(0, -1);
  const dvIngresado = limpio.slice(-1);
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resultado = 11 - (suma % 11);
  const dvCalculado =
    resultado === 11 ? "0" : resultado === 10 ? "K" : String(resultado);

  return dvCalculado === dvIngresado;
}

function validarCorreoInacap(email) {
  return /^[a-zA-Z0-9._-]+@inacap\.cl$/i.test(String(email));
}

function validarIsbn(isbn) {
  const limpio = String(isbn).replace(/[^0-9Xx]/g, "").toUpperCase();

  if (limpio.length === 10) {
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      if (!/^[0-9]$/.test(limpio[i])) return false;
      suma += Number(limpio[i]) * (10 - i);
    }
    const digito = limpio[9] === "X" ? 10 : Number(limpio[9]);
    if (limpio[9] !== "X" && !/^[0-9]$/.test(limpio[9])) return false;
    return (suma + digito) % 11 === 0;
  }

  if (limpio.length === 13) {
    if (!/^[0-9]+$/.test(limpio)) return false;
    let suma = 0;
    for (let i = 0; i < 12; i++) {
      suma += Number(limpio[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const digitoControl = (10 - (suma % 10)) % 10;
    return digitoControl === Number(limpio[12]);
  }

  return false;
}

// Control de intentos fallidos
let intentosFallidos = 0;
const MAX_INTENTOS = 3;

function validarLogin(email, password) {
  if (intentosFallidos >= MAX_INTENTOS) {
    return {
      ok: false,
      msg: "🔒 Cuenta bloqueada. Superaste los 3 intentos permitidos.",
    };
  }

  // Buscamos si el correo existe en nuestra base de datos simulada (datos.js)
  const usuarioValido = users.find((u) => u.email === email);

  if (!usuarioValido) {
    intentosFallidos++;
    return {
      ok: false,
      msg: `Credenciales incorrectas. Intento ${intentosFallidos}/${MAX_INTENTOS}`,
    };
  }

  const errorPass = validarPasswordSegura(password);
  if (errorPass) {
    intentosFallidos++;
    return {
      ok: false,
      msg: `Seguridad: ${errorPass} (Intento ${intentosFallidos}/${MAX_INTENTOS})`,
    };
  }

  intentosFallidos = 0; // Si entra bien, reiniciamos
  return { ok: true, user: usuarioValido };
}
