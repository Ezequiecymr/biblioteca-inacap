<?php
$origen = $_SERVER['HTTP_ORIGIN'] ?? '';
$origenesPermitidos = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost/biblioteca',
    'http://127.0.0.1/biblioteca',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
];

if (in_array($origen, $origenesPermitidos, true)) {
    header("Access-Control-Allow-Origin: $origen");
    header("Vary: Origin");
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$conn = new mysqli("localhost", "root", "", "biblioteca_inacap");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "msg" => "Error de conexión: " . $conn->connect_error]);
    exit;
}
$conn->set_charset("utf8mb4");

function responder($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
}

function leerJson() {
    $data = json_decode(file_get_contents("php://input"), true);
    return is_array($data) ? $data : [];
}

function obtenerFechaSistema() {
    global $conn;
    $conn->query("
        CREATE TABLE IF NOT EXISTS tiempo_simulacion (
            id TINYINT PRIMARY KEY,
            fecha_actual DATE NOT NULL
        )
    ");

    $row = $conn->query("SELECT fecha_actual FROM tiempo_simulacion WHERE id = 1")
        ->fetch_assoc();

    return $row ? $row['fecha_actual'] : date("Y-m-d");
}

function establecerFechaSistema($fecha) {
    global $conn;
    $conn->query("
        CREATE TABLE IF NOT EXISTS tiempo_simulacion (
            id TINYINT PRIMARY KEY,
            fecha_actual DATE NOT NULL
        )
    ");
    $stmt = $conn->prepare("
        INSERT INTO tiempo_simulacion (id, fecha_actual)
        VALUES (1, ?)
        ON DUPLICATE KEY UPDATE fecha_actual = VALUES(fecha_actual)
    ");
    $stmt->bind_param("s", $fecha);
    $stmt->execute();
    $stmt->close();
}

function recalcularAtrasosYDeudas() {
    global $conn;
    $fechaSistema = obtenerFechaSistema();

    $conn->query("
        UPDATE prestamos
        SET estado = 'overdue'
        WHERE estado = 'active'
          AND fecha_devolucion < '$fechaSistema'
    ");

    $conn->query("
        UPDATE usuarios u
        JOIN prestamos p ON p.usuario_id = u.id
        LEFT JOIN multas_simuladas ms
          ON ms.usuario_id = u.id
         AND ms.prestamo_id = p.id
         AND ms.pagada = 1
        SET u.deuda = 1
        WHERE p.estado = 'overdue'
          AND ms.id IS NULL
    ");

    $conn->query("
        UPDATE usuarios u
        JOIN multas_simuladas ms ON ms.usuario_id = u.id
        SET u.deuda = 0
        WHERE ms.pagada = 1
          AND NOT EXISTS (
              SELECT 1
              FROM multas_simuladas pendientes
              WHERE pendientes.usuario_id = u.id
                AND pendientes.pagada = 0
          )
    ");
}

function crearTablasSimulacion() {
    global $conn;
    $conn->query("
        CREATE TABLE IF NOT EXISTS prestamos_atrasos_simulados (
            prestamo_id INT PRIMARY KEY,
            FOREIGN KEY (prestamo_id) REFERENCES prestamos(id)
        )
    ");
    $conn->query("
        CREATE TABLE IF NOT EXISTS usuarios_deuda_simulada (
            usuario_id INT PRIMARY KEY,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    ");
    $conn->query("
        CREATE TABLE IF NOT EXISTS multas_simuladas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            prestamo_id INT NOT NULL UNIQUE,
            usuario_id INT NOT NULL,
            dias_retraso INT NOT NULL,
            monto INT NOT NULL,
            pagada BOOLEAN NOT NULL DEFAULT FALSE,
            FOREIGN KEY (prestamo_id) REFERENCES prestamos(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    ");
}

function registrarMultasSimuladas($fechaSistema) {
    global $conn;
    crearTablasSimulacion();

    $result = $conn->query("
        SELECT pas.prestamo_id, p.usuario_id,
               DATEDIFF('$fechaSistema', p.fecha_devolucion) AS dias_retraso
        FROM prestamos_atrasos_simulados pas
        JOIN prestamos p ON p.id = pas.prestamo_id
        WHERE p.estado = 'overdue'
    ");

    while ($row = $result->fetch_assoc()) {
        $dias = max(1, (int)$row['dias_retraso']);
        $monto = $dias * 500;
        $prestamoId = (int)$row['prestamo_id'];
        $usuarioId = (int)$row['usuario_id'];

        $stmt = $conn->prepare("
            INSERT INTO multas_simuladas
                (prestamo_id, usuario_id, dias_retraso, monto)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                dias_retraso = VALUES(dias_retraso),
                monto = VALUES(monto)
        ");
        $stmt->bind_param("iiii", $prestamoId, $usuarioId, $dias, $monto);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("
            INSERT IGNORE INTO usuarios_deuda_simulada (usuario_id)
            VALUES (?)
        ");
        $stmt->bind_param("i", $usuarioId);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("UPDATE usuarios SET deuda = 1 WHERE id = ?");
        $stmt->bind_param("i", $usuarioId);
        $stmt->execute();
        $stmt->close();
    }
}

function validarRUT($rutCompleto) {
    $limpio = preg_replace('/[^0-9kK]/', '', (string)$rutCompleto);
    if (strlen($limpio) < 2) return false;

    $cuerpo = substr($limpio, 0, -1);
    $dvIngresado = strtoupper(substr($limpio, -1));
    $suma = 0;
    $multiplicador = 2;

    for ($i = strlen($cuerpo) - 1; $i >= 0; $i--) {
        $suma += intval($cuerpo[$i]) * $multiplicador;
        $multiplicador = ($multiplicador === 7) ? 2 : $multiplicador + 1;
    }

    $resultado = 11 - ($suma % 11);
    $dvCalculado = ($resultado === 11)
        ? '0'
        : (($resultado === 10) ? 'K' : strval($resultado));

    return $dvCalculado === $dvIngresado;
}

function validarPasswordSeguraPHP($password) {
    if (!is_string($password) || strlen($password) < 8) {
        return "Debe tener al menos 8 caracteres.";
    }
    if (preg_match('/\s/', $password)) {
        return "No debe contener espacios en blanco.";
    }
    if (!preg_match('/[A-Z]/', $password)) {
        return "Debe tener al menos una mayúscula.";
    }
    if (!preg_match('/[a-z]/', $password)) {
        return "Debe tener al menos una minúscula.";
    }
    if (!preg_match('/[0-9]/', $password)) {
        return "Debe tener al menos un número.";
    }
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        return "Debe tener al menos un carácter especial (ej: @, #, $, !, %).";
    }

    foreach (['1234', 'qwerty', 'admin', 'password', 'inacap', 'chile', 'clave'] as $patron) {
        if (stripos($password, $patron) !== false) {
            return "La contraseña es muy común o contiene palabras no permitidas.";
        }
    }
    return null;
}

function validarIsbn($isbn) {
    $limpio = preg_replace('/[^0-9Xx]/', '', (string)$isbn);
    $limpio = strtoupper($limpio);

    if (strlen($limpio) === 10) {
        $suma = 0;
        for ($i = 0; $i < 9; $i++) {
            if (!ctype_digit($limpio[$i])) return false;
            $suma += intval($limpio[$i]) * (10 - $i);
        }
        $digito = $limpio[9] === 'X' ? 10 : (ctype_digit($limpio[9]) ? intval($limpio[9]) : -1);
        if ($digito < 0) return false;
        return ($suma + $digito) % 11 === 0;
    }

    if (strlen($limpio) === 13) {
        if (!ctype_digit($limpio)) return false;
        $suma = 0;
        for ($i = 0; $i < 12; $i++) {
            $suma += intval($limpio[$i]) * ($i % 2 === 0 ? 1 : 3);
        }
        $digitoControl = (10 - ($suma % 10)) % 10;
        return intval($limpio[12]) === $digitoControl;
    }

    return false;
}

$accion = $_GET['accion'] ?? '';

// 1. LOGIN DE USUARIOS
if ($accion == 'login') {
    $data = json_decode(file_get_contents("php://input"), true);
    $email = strtolower((string)($data['email'] ?? ''));
    $pass = (string)($data['password'] ?? '');
    recalcularAtrasosYDeudas();

    if (!preg_match('/^[a-zA-Z0-9._-]+@inacap\.cl$/', $email)) {
        responder(["success" => false, "msg" => "El correo debe tener el formato usuario@inacap.cl"], 400);
        exit;
    }
    if (preg_match('/\s/', $pass)) {
        responder(["success" => false, "msg" => "La contraseña no puede contener espacios en blanco"], 400);
        exit;
    }

    // Buscamos solo por correo para ver si existe
    $stmt = $conn->prepare("SELECT id, nombre, tipo, email, deuda, contrasena, intentos_fallidos FROM usuarios WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        // Si ya está bloqueado, no lo dejamos ni intentar
        if ($row['deuda'] == 1) {
            echo json_encode(["success" => false, "msg" => "🔒 Tu cuenta está BLOQUEADA por multas pendientes."]);
            exit();
        }
        
        // Si ya tiene 3 intentos, no lo dejamos
        if ($row['intentos_fallidos'] >= 3) {
            echo json_encode(["success" => false, "msg" => "🔒 Cuenta bloqueada por seguridad (3 intentos fallidos). Contacta al administrador."]);
            exit();
        }

        // Compatibilidad con registros antiguos en texto plano y hashes nuevos
        $passwordValida = password_get_info($row['contrasena'])['algo'] !== 0
            ? password_verify($pass, $row['contrasena'])
            : hash_equals($row['contrasena'], $pass);

        if ($passwordValida) {
            if (password_get_info($row['contrasena'])['algo'] === 0) {
                $nuevoHash = password_hash($pass, PASSWORD_BCRYPT);
                $stmtMigracion = $conn->prepare("UPDATE usuarios SET contrasena = ? WHERE id = ?");
                $stmtMigracion->bind_param("si", $nuevoHash, $row['id']);
                $stmtMigracion->execute();
                $stmtMigracion->close();
            }
            // Si acierta, reseteamos los intentos a 0
            $conn->query("UPDATE usuarios SET intentos_fallidos = 0 WHERE id = " . $row['id']);
            
            // Devolvemos los datos (sin la contraseña)
            unset($row['contrasena']); 
            unset($row['intentos_fallidos']);
            echo json_encode(["success" => true, "user" => $row]);
        } else {
            // Si falla, sumamos 1 intento
            $nuevos_intentos = $row['intentos_fallidos'] + 1;
            $conn->query("UPDATE usuarios SET intentos_fallidos = $nuevos_intentos WHERE id = " . $row['id']);
            
            $intentos_restantes = 3 - $nuevos_intentos;
            
            if ($intentos_restantes > 0) {
                echo json_encode(["success" => false, "msg" => "Contraseña incorrecta. Te quedan $intentos_restantes intentos."]);
            } else {
                echo json_encode(["success" => false, "msg" => "🔒 Cuenta bloqueada. Superaste los 3 intentos permitidos."]);
            }
        }
    } else {
        echo json_encode(["success" => false, "msg" => "El correo ingresado no está registrado."]);
    }
}


elseif ($accion === 'toggle_block') {
    $data = leerJson();
    $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    if ($id === false || $id < 1) {
        responder(["success" => false, "msg" => "ID de usuario inválido"], 400);
        exit;
    }

    $stmt = $conn->prepare("SELECT deuda FROM usuarios WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        responder(["success" => false, "msg" => "Usuario no encontrado"], 404);
        exit;
    }

    $nuevo_estado = $row['deuda'] ? 0 : 1;
    
    // Si lo vamos a desbloquear (nuevo_estado == 0), también reseteamos los intentos a 0
    if ($nuevo_estado == 0) {
        $stmt = $conn->prepare("UPDATE usuarios SET deuda = ?, intentos_fallidos = 0 WHERE id = ?");
    } else {
        $stmt = $conn->prepare("UPDATE usuarios SET deuda = ? WHERE id = ?");
    }
    
    $stmt->bind_param("ii", $nuevo_estado, $id);
    $ok = $stmt->execute();
    $stmt->close();

    responder($ok
        ? ["success" => true, "nuevo_estado" => $nuevo_estado]
        : ["success" => false, "msg" => "Error al actualizar"]
    );
}

elseif ($accion === 'prestamo') {
    $data = leerJson();
    $usuario_id = filter_var($data['usuario_id'] ?? null, FILTER_VALIDATE_INT);
    $libro_id = filter_var($data['libro_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$usuario_id || !$libro_id) {
        responder(["success" => false, "msg" => "Usuario y libro requeridos"], 400);
        exit;
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("SELECT disponible FROM libros WHERE id = ? FOR UPDATE");
        $stmt->bind_param("i", $libro_id);
        $stmt->execute();
        $libro = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$libro) {
            throw new Exception("Libro no encontrado");
        }
        if ((int)$libro['disponible'] <= 0) {
            throw new Exception("No hay ejemplares disponibles");
        }

        $fecha_salida = obtenerFechaSistema();
        $fecha_devolucion = date("Y-m-d", strtotime("$fecha_salida +14 days"));
        $estado = 'active';
        $stmt = $conn->prepare("INSERT INTO prestamos (usuario_id, libro_id, fecha_salida, fecha_devolucion, estado) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("iisss", $usuario_id, $libro_id, $fecha_salida, $fecha_devolucion, $estado);
        if (!$stmt->execute()) {
            throw new Exception("Error al registrar el préstamo");
        }
        $prestamo_id = $stmt->insert_id;
        $stmt->close();

        $stmt = $conn->prepare("UPDATE libros SET disponible = disponible - 1 WHERE id = ? AND disponible > 0");
        $stmt->bind_param("i", $libro_id);
        if (!$stmt->execute() || $stmt->affected_rows !== 1) {
            throw new Exception("No fue posible actualizar el stock");
        }
        $stmt->close();

        $conn->commit();
        responder(["success" => true, "msg" => "Préstamo registrado en MySQL", "prestamo_id" => $prestamo_id]);
    } catch (Exception $e) {
        $conn->rollback();
        responder(["success" => false, "msg" => $e->getMessage()], 400);
    }
}

elseif ($accion === 'pagar_multa') {
    $data = leerJson();
    $multaId = filter_var($data['multa_id'] ?? null, FILTER_VALIDATE_INT);

    if (!$multaId) {
        responder(["success" => false, "msg" => "Multa inválida"], 400);
        exit;
    }

    crearTablasSimulacion();
    $stmt = $conn->prepare("
        SELECT id, usuario_id
        FROM multas_simuladas
        WHERE id = ? AND pagada = 0
    ");
    $stmt->bind_param("i", $multaId);
    $stmt->execute();
    $multa = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$multa) {
        responder(["success" => false, "msg" => "La multa no existe o ya fue pagada"], 404);
        exit;
    }

    $usuarioId = (int)$multa['usuario_id'];
    $stmt = $conn->prepare("
        UPDATE multas_simuladas
        SET pagada = 1
        WHERE id = ?
    ");
    $stmt->bind_param("i", $multaId);
    if (!$stmt->execute()) {
        $stmt->close();
        responder(["success" => false, "msg" => "No fue posible registrar el pago"], 500);
        exit;
    }
    $stmt->close();

    $stmt = $conn->prepare("
        DELETE FROM usuarios_deuda_simulada
        WHERE usuario_id = ? 
          AND NOT EXISTS (
              SELECT 1 FROM multas_simuladas
              WHERE usuario_id = ? AND pagada = 0
          )
    ");
    $stmt->bind_param("ii", $usuarioId, $usuarioId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare("
        UPDATE usuarios
        SET deuda = 0
        WHERE id = ?
          AND NOT EXISTS (
              SELECT 1 FROM multas_simuladas
              WHERE usuario_id = ? AND pagada = 0
          )
    ");
    $stmt->bind_param("ii", $usuarioId, $usuarioId);
    $stmt->execute();
    $stmt->close();

    responder([
        "success" => true,
        "msg" => "Pago registrado y usuario desbloqueado"
    ]);
}

elseif ($accion === 'devolver') {
    $data = leerJson();
    $prestamo_id = filter_var($data['prestamo_id'] ?? null, FILTER_VALIDATE_INT);
    $libro_id = filter_var($data['libro_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$prestamo_id || !$libro_id) {
        responder(["success" => false, "msg" => "Préstamo y libro requeridos"], 400);
        exit;
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("SELECT usuario_id, libro_id, estado FROM prestamos WHERE id = ? FOR UPDATE");
        $stmt->bind_param("i", $prestamo_id);
        $stmt->execute();
        $prestamo = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$prestamo) {
            throw new Exception("Préstamo no encontrado");
        }
        if ($prestamo['estado'] === 'returned') {
            throw new Exception("El préstamo ya fue devuelto");
        }
        if ((int)$prestamo['libro_id'] !== $libro_id) {
            throw new Exception("El libro no corresponde al préstamo");
        }

        $estado = 'returned';
        $stmt = $conn->prepare("UPDATE prestamos SET estado = ? WHERE id = ?");
        $stmt->bind_param("si", $estado, $prestamo_id);
        if (!$stmt->execute()) {
            throw new Exception("Error al registrar la devolución");
        }
        $stmt->close();

        $stmt = $conn->prepare("UPDATE libros SET disponible = disponible + 1 WHERE id = ?");
        $stmt->bind_param("i", $libro_id);
        if (!$stmt->execute()) {
            throw new Exception("Error al actualizar el stock");
        }
        $stmt->close();

        $usuarioId = (int)$prestamo['usuario_id'];
        crearTablasSimulacion();

        $stmt = $conn->prepare("DELETE FROM multas_simuladas WHERE prestamo_id = ?");
        $stmt->bind_param("i", $prestamo_id);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("DELETE FROM prestamos_atrasos_simulados WHERE prestamo_id = ?");
        $stmt->bind_param("i", $prestamo_id);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM prestamos WHERE usuario_id = ? AND estado = 'overdue'");
        $stmt->bind_param("i", $usuarioId);
        $stmt->execute();
        $atrasosRestantes = (int)$stmt->get_result()->fetch_assoc()['total'];
        $stmt->close();

        if ($atrasosRestantes === 0) {
            $stmt = $conn->prepare("
                SELECT usuario_id FROM usuarios_deuda_simulada WHERE usuario_id = ?
            ");
            $stmt->bind_param("i", $usuarioId);
            $stmt->execute();
            $esDeudaSimulada = (bool)$stmt->get_result()->fetch_assoc();
            $stmt->close();

            if ($esDeudaSimulada) {
                $stmt = $conn->prepare("UPDATE usuarios SET deuda = 0 WHERE id = ?");
                $stmt->bind_param("i", $usuarioId);
                $stmt->execute();
                $stmt->close();

                $stmt = $conn->prepare("DELETE FROM usuarios_deuda_simulada WHERE usuario_id = ?");
                $stmt->bind_param("i", $usuarioId);
                $stmt->execute();
                $stmt->close();
            }
        }

        $conn->commit();
        responder(["success" => true, "msg" => "Devolución registrada en MySQL"]);
    } catch (Exception $e) {
        $conn->rollback();
        responder(["success" => false, "msg" => $e->getMessage()], 400);
    }
}


elseif ($accion === 'editar_usuario') {
    $data = leerJson();
    $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    $tipo = trim((string)($data['tipo'] ?? ''));
    $area = trim((string)($data['area'] ?? ''));
    $email = strtolower((string)($data['email'] ?? ''));
    $password = (string)($data['password'] ?? '');

    if (!$id || !$tipo || !$area || !$email) {
        responder(["success" => false, "msg" => "Tipo, área y correo son obligatorios"], 400);
        exit;
    }

    if (!in_array($tipo, ['Estudiante', 'Bibliotecario', 'Administrador'], true)) {
        responder(["success" => false, "msg" => "Tipo de usuario inválido"], 400);
        exit;
    }

    if (!preg_match('/^[a-zA-Z0-9._-]+@inacap\.cl$/', $email)) {
        responder(["success" => false, "msg" => "El correo debe tener el formato usuario@inacap.cl"], 400);
        exit;
    }

    $stmt = $conn->prepare("SELECT id FROM usuarios WHERE email = ? AND id <> ?");
    $stmt->bind_param("si", $email, $id);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        responder(["success" => false, "msg" => "El correo ya está registrado"], 409);
        exit;
    }
    $stmt->close();

    if ($password !== '') {
        $errorPassword = validarPasswordSeguraPHP($password);
        if ($errorPassword !== null) {
            responder(["success" => false, "msg" => $errorPassword], 400);
            exit;
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $conn->prepare("
            UPDATE usuarios
            SET tipo = ?, area = ?, email = ?, contrasena = ?, intentos_fallidos = 0
            WHERE id = ?
        ");
        $stmt->bind_param("ssssi", $tipo, $area, $email, $passwordHash, $id);
    } else {
        $stmt = $conn->prepare("
            UPDATE usuarios
            SET tipo = ?, area = ?, email = ?
            WHERE id = ?
        ");
        $stmt->bind_param("sssi", $tipo, $area, $email, $id);
    }

    if (!$stmt->execute()) {
        $stmt->close();
        responder(["success" => false, "msg" => "No fue posible actualizar el usuario"], 500);
        exit;
    }

    $stmt->close();
    responder(["success" => true, "msg" => "Usuario actualizado"]);
}

elseif ($accion === 'registrar_usuario') {
    $data = leerJson();
    $nombre = trim((string)($data['nombre'] ?? ''));
    $rut = trim((string)($data['rut'] ?? ''));
    $tipo = trim((string)($data['tipo'] ?? ''));
    $area = trim((string)($data['area'] ?? ''));
    $email = strtolower((string)($data['email'] ?? ''));
    $password = (string)($data['password'] ?? '');

    if (!$nombre || !$rut || !$tipo || !$area || !$email || !$password) {
        responder(["success" => false, "msg" => "Todos los campos son requeridos"], 400);
        exit;
    }

    if (!validarRUT($rut)) {
        responder(["success" => false, "msg" => "RUT inválido"], 400);
        exit;
    }

    $email = strtolower($email);
    if (!preg_match('/^[a-zA-Z0-9._-]+@inacap\.cl$/', $email)) {
        responder(["success" => false, "msg" => "El correo debe tener el formato usuario@inacap.cl"], 400);
        exit;
    }

    if (!in_array($tipo, ['Estudiante', 'Bibliotecario', 'Administrador'], true)) {
        responder(["success" => false, "msg" => "Tipo de usuario inválido"], 400);
        exit;
    }

    $errorPassword = validarPasswordSeguraPHP($password);
    if ($errorPassword !== null) {
        responder([
            "success" => false,
            "msg" => $errorPassword
        ], 400);
        exit;
    }

    $stmt = $conn->prepare("SELECT id FROM usuarios WHERE email = ? OR rut = ?");
    $stmt->bind_param("ss", $email, $rut);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        responder(["success" => false, "msg" => "El correo o RUT ya están registrados"], 409);
        exit;
    }
    $stmt->close();

    $deuda = 0;
    $intentos = 0;
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    if ($passwordHash === false) {
        responder(["success" => false, "msg" => "No fue posible proteger la contraseña"], 500);
        exit;
    }

    $stmt = $conn->prepare("
        INSERT INTO usuarios
        (nombre, rut, tipo, area, email, contrasena, deuda, intentos_fallidos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param(
        "ssssssii",
        $nombre,
        $rut,
        $tipo,
        $area,
        $email,
        $passwordHash,
        $deuda,
        $intentos
    );

    if (!$stmt->execute()) {
        $msg = "No fue posible registrar el usuario";
        $stmt->close();
        responder(["success" => false, "msg" => $msg], 500);
        exit;
    }

    $id = $stmt->insert_id;
    $stmt->close();
    responder([
        "success" => true,
        "msg" => "Usuario registrado correctamente",
        "id" => $id
    ], 201);
}

elseif ($accion === 'obtener_tiempo') {
    responder([
        "success" => true,
        "fecha" => obtenerFechaSistema(),
        "fecha_real" => date("Y-m-d")
    ]);
}

elseif ($accion === 'simular_tiempo') {
    $data = leerJson();
    $dias = filter_var($data['dias'] ?? null, FILTER_VALIDATE_INT);

    if ($dias === false) {
        responder(["success" => false, "msg" => "Cantidad de días inválida"], 400);
        exit;
    }

    $fechaActual = obtenerFechaSistema();
    $nuevaFecha = date("Y-m-d", strtotime("$fechaActual " . (($dias >= 0) ? "+" : "") . "$dias days"));
    establecerFechaSistema($nuevaFecha);

    crearTablasSimulacion();
    $stmt = $conn->prepare("
        INSERT IGNORE INTO prestamos_atrasos_simulados (prestamo_id)
        SELECT id FROM prestamos
        WHERE estado = 'active' AND fecha_devolucion < ?
    ");
    $stmt->bind_param("s", $nuevaFecha);
    $stmt->execute();
    $stmt->close();

    recalcularAtrasosYDeudas();
    registrarMultasSimuladas($nuevaFecha);

    responder([
        "success" => true,
        "msg" => "Tiempo actualizado",
        "fecha" => $nuevaFecha,
        "usuarios_bloqueados" => $conn->query("SELECT COUNT(*) AS total FROM usuarios WHERE deuda = 1")
            ->fetch_assoc()['total'],
        "multas_generadas" => $conn->query("SELECT COUNT(*) AS total FROM multas_simuladas")
            ->fetch_assoc()['total']
    ]);
}

elseif ($accion === 'reiniciar_tiempo') {
    $fechaReal = date("Y-m-d");

    crearTablasSimulacion();
    $conn->begin_transaction();
    try {
    $conn->query("
        UPDATE prestamos p
        JOIN prestamos_atrasos_simulados pas ON pas.prestamo_id = p.id
        SET p.estado = 'active'
    ");
    $conn->query("
        UPDATE usuarios u
        JOIN usuarios_deuda_simulada uds ON uds.usuario_id = u.id
        SET u.deuda = 0
    ");
    $conn->query("DELETE FROM multas_simuladas");
    $conn->query("DELETE FROM prestamos_atrasos_simulados");
    $conn->query("DELETE FROM usuarios_deuda_simulada");

    establecerFechaSistema($fechaReal);
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        responder(["success" => false, "msg" => "No fue posible reiniciar el tiempo"], 500);
        exit;
    }

    responder([
        "success" => true,
        "msg" => "Tiempo reiniciado",
        "fecha" => $fechaReal
    ]);
}

elseif ($accion === 'registrar_libro') {
    $data = leerJson();
    $titulo = trim((string)($data['titulo'] ?? ''));
    $autor = trim((string)($data['autor'] ?? ''));
    $isbn = trim((string)($data['isbn'] ?? ''));
    $categoria = trim((string)($data['categoria'] ?? ''));
    $stock = isset($data['stock']) ? intval($data['stock']) : 0;

    if (!$titulo || !$autor || !$isbn || $stock === false || $stock < 1) {
        responder(["success" => false, "msg" => "Título, autor, ISBN y stock válido son obligatorios"], 400);
        exit;
    }

    if (!validarIsbn($isbn)) {
        responder(["success" => false, "msg" => "ISBN-10 o ISBN-13 inválido"], 400);
        exit;
    }

    $isbnLimpio = strtoupper(preg_replace('/[^0-9Xx]/', '', $isbn));
    $stmt = $conn->prepare("
        SELECT id FROM libros
        WHERE titulo = ? OR REPLACE(REPLACE(REPLACE(isbn, '-', ''), ' ', ''), '.', '') = ?
        LIMIT 1
    ");
    $stmt->bind_param("ss", $titulo, $isbnLimpio);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        responder(["success" => false, "msg" => "Ya existe un libro con ese título o ISBN"], 409);
        exit;
    }
    $stmt->close();

    $disponible = $stock;
    $stmt = $conn->prepare("
        INSERT INTO libros (titulo, autor, isbn, categoria, stock, disponible)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("ssssii", $titulo, $autor, $isbn, $categoria, $stock, $disponible);

    if (!$stmt->execute()) {
        $stmt->close();
        responder(["success" => false, "msg" => "No fue posible registrar el libro"], 500);
        exit;
    }

    $id = $stmt->insert_id;
    $stmt->close();
    responder([
        "success" => true,
        "msg" => "Libro registrado correctamente",
        "id" => $id
    ], 201);
}

elseif ($accion === 'editar_libro') {
    $data = leerJson();
    $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    $stock = isset($data['stock']) ? intval($data['stock']) : 0;

    if (!$id || $stock < 1) {
        responder(["success" => false, "msg" => "Stock válido es obligatorio"], 400);
        exit;
    }

    $stmt = $conn->prepare("
        SELECT COUNT(*) AS activos
        FROM prestamos
        WHERE libro_id = ? AND estado IN ('active', 'overdue')
    ");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $activos = (int)$stmt->get_result()->fetch_assoc()['activos'];
    $stmt->close();

    if ($stock < $activos) {
        responder([
            "success" => false,
            "msg" => "El stock no puede ser menor que los ejemplares actualmente prestados ($activos)"
        ], 400);
        exit;
    }

    $disponible = $stock - $activos;
    $stmt = $conn->prepare("
        UPDATE libros
        SET stock = ?, disponible = ?
        WHERE id = ?
    ");
    $stmt->bind_param("iii", $stock, $disponible, $id);

    if (!$stmt->execute()) {
        $stmt->close();
        responder(["success" => false, "msg" => "No fue posible actualizar el libro"], 500);
        exit;
    }

    $stmt->close();
    responder([
        "success" => true,
        "msg" => "Libro actualizado correctamente",
        "disponible" => $disponible
    ]);
}

elseif ($accion === 'obtener_datos') {
    recalcularAtrasosYDeudas();
    $usuarios = [];
    $result = $conn->query("
        SELECT id, nombre, rut, tipo, area, email, deuda, intentos_fallidos
        FROM usuarios
    ");

    while ($row = $result->fetch_assoc()) {
        $usuarios[] = [
            "id" => (int) $row["id"],
            "name" => $row["nombre"],
            "rut" => $row["rut"],
            "type" => $row["tipo"],
            "area" => $row["area"],
            "email" => $row["email"],
            "debt" => (bool) $row["deuda"],
            "intentos_fallidos" => (int) $row["intentos_fallidos"],
            "loans" => 0
        ];
    }

    $libros = [];
    $result = $conn->query("
        SELECT id, titulo, autor, isbn, categoria, stock, disponible
        FROM libros
    ");

    while ($row = $result->fetch_assoc()) {
        $libros[] = [
            "id" => (int) $row["id"],
            "title" => $row["titulo"],
            "author" => $row["autor"],
            "isbn" => $row["isbn"],
            "category" => $row["categoria"],
            "stock" => (int) $row["stock"],
            "available" => (int) $row["disponible"],
            "color" => "#3b82f6"
        ];
    }

    $prestamos = [];
    $result = $conn->query("
        SELECT id, usuario_id, libro_id, fecha_salida,
               fecha_devolucion, estado
        FROM prestamos
    ");

    while ($row = $result->fetch_assoc()) {
        $prestamos[] = [
            "id" => (int) $row["id"],
            "user_id" => (int) $row["usuario_id"],
            "book_id" => (int) $row["libro_id"],
            "start" => $row["fecha_salida"],
            "due" => $row["fecha_devolucion"],
            "status" => $row["estado"],
            "renewals" => 0
        ];
    }

    crearTablasSimulacion();
    $multasSimuladas = [];
    $result = $conn->query("
        SELECT ms.id, ms.prestamo_id, ms.usuario_id,
               ms.dias_retraso, ms.monto, ms.pagada
        FROM multas_simuladas ms
        WHERE ms.pagada = 0
        ORDER BY ms.id
    ");
    while ($row = $result->fetch_assoc()) {
        $multasSimuladas[] = [
            "id" => (int)$row["id"],
            "prestamo_id" => (int)$row["prestamo_id"],
            "usuario_id" => (int)$row["usuario_id"],
            "dias" => (int)$row["dias_retraso"],
            "amount" => (int)$row["monto"],
            "paid" => false
        ];
    }

    $totalPrestamos = (int)$conn->query(
        "SELECT COUNT(*) AS total FROM prestamos"
    )->fetch_assoc()['total'];
    $totalDevoluciones = (int)$conn->query(
        "SELECT COUNT(*) AS total FROM prestamos WHERE estado = 'returned'"
    )->fetch_assoc()['total'];
    $usuariosUnicos = (int)$conn->query(
        "SELECT COUNT(DISTINCT usuario_id) AS total FROM prestamos"
    )->fetch_assoc()['total'];

    $totalMultas = 0;
    $result = $conn->query("SELECT COUNT(*) AS total FROM multas_simuladas");
    if ($row = $result->fetch_assoc()) {
        $totalMultas = (int)$row['total'];
    }
    $montoMultas = 0;
    $result = $conn->query(
        "SELECT COALESCE(SUM(monto), 0) AS total FROM multas_simuladas"
    );
    if ($row = $result->fetch_assoc()) {
        $montoMultas = (int)$row['total'];
    }

    $mensual = [];
    for ($mes = 1; $mes <= 12; $mes++) {
        $prestamosMes = (int)$conn->query("
            SELECT COUNT(*) AS total
            FROM prestamos
            WHERE MONTH(fecha_salida) = $mes
        ")->fetch_assoc()['total'];
        $devolucionesMes = (int)$conn->query("
            SELECT COUNT(*) AS total
            FROM prestamos
            WHERE estado = 'returned'
              AND MONTH(fecha_salida) = $mes
        ")->fetch_assoc()['total'];
        $mensual[] = [
            "mes" => $mes,
            "prestamos" => $prestamosMes,
            "devoluciones" => $devolucionesMes
        ];
    }

    $topLibros = [];
    $result = $conn->query("
        SELECT l.titulo, COUNT(p.id) AS cantidad
        FROM prestamos p
        JOIN libros l ON l.id = p.libro_id
        GROUP BY l.id, l.titulo
        ORDER BY cantidad DESC, l.titulo ASC
        LIMIT 8
    ");
    while ($row = $result->fetch_assoc()) {
        $topLibros[] = [
            "titulo" => $row['titulo'],
            "cantidad" => (int)$row['cantidad']
        ];
    }

    $usuariosMultas = [];
    $result = $conn->query("
        SELECT u.nombre, u.rut,
               COUNT(ms.id) AS cantidad,
               COALESCE(SUM(ms.monto), 0) AS monto
        FROM multas_simuladas ms
        JOIN usuarios u ON u.id = ms.usuario_id
        GROUP BY u.id, u.nombre, u.rut
        ORDER BY monto DESC
        LIMIT 5
    ");
    while ($row = $result->fetch_assoc()) {
        $usuariosMultas[] = [
            "nombre" => $row['nombre'],
            "rut" => $row['rut'],
            "cantidad" => (int)$row['cantidad'],
            "monto" => (int)$row['monto']
        ];
    }

    $reporte = [
        "total_prestamos" => $totalPrestamos,
        "total_devoluciones" => $totalDevoluciones,
        "usuarios_unicos" => $usuariosUnicos,
        "total_multas" => $totalMultas,
        "monto_multas" => $montoMultas,
        "mensual" => $mensual,
        "top_libros" => $topLibros,
        "usuarios_multas" => $usuariosMultas
    ];

    responder([
        "success" => true,
        "users" => $usuarios,
        "books" => $libros,
        "loans" => $prestamos,
        "simulated_fines" => $multasSimuladas,
        "report" => $reporte
    ]);
}

else {
    responder(["success" => false, "msg" => "Acción no válida"], 400);
}

$conn->close();
?>