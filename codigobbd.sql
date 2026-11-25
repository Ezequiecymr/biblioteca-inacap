-- 1. CREAR LA BASE DE DATOS
CREATE DATABASE IF NOT EXISTS biblioteca_inacap;
USE biblioteca_inacap;

-- 2. CREAR LAS TABLAS
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    rut VARCHAR(20) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    area VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    deuda BOOLEAN DEFAULT FALSE,
    intentos_fallidos INT DEFAULT 0
);

CREATE TABLE libros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    autor VARCHAR(100) NOT NULL,
    isbn VARCHAR(50),
    categoria VARCHAR(50),
    stock INT NOT NULL,
    disponible INT NOT NULL
);

CREATE TABLE prestamos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    libro_id INT NOT NULL,
    fecha_salida DATE NOT NULL,
    fecha_devolucion DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'active',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (libro_id) REFERENCES libros(id)
);

-- ==========================================
-- 3. INSERTAR USUARIOS (8 en total)
-- ==========================================
INSERT INTO usuarios (nombre, rut, tipo, area, email, contrasena, deuda, intentos_fallidos) VALUES
('María González López', '12.345.678-9', 'Estudiante', 'Ing. en Informática', 'mgonzalez@inacap.cl', 'Inacap2026', FALSE, 0),
('Carlos Rodríguez Muñoz', '15.234.567-8', 'Estudiante', 'Administración de Empresas', 'crodriguez@inacap.cl', 'Inacap2026', TRUE, 0),
('Carlos Rojas (TI)', '18.765.432-1', 'Administrador', 'Dirección de Informática', 'admin@inacap.cl', 'Inacap2026', FALSE, 0),
('Pedro Soto Vega', '14.321.654-K', 'Estudiante', 'Diseño Gráfico Digital', 'psoto@inacap.cl', 'Inacap2026', FALSE, 0),
('Laura Pérez Castillo', '16.543.210-2', 'Estudiante', 'Contabilidad General', 'lperez@inacap.cl', 'Inacap2026', TRUE, 0),
('Roberto Díaz Torres', '13.456.789-3', 'Bibliotecario', 'Ciencias Exactas', 'rdiaz@inacap.cl', 'Inacap2026', FALSE, 0),
('Valentina Rojas Fuentes', '19.876.543-2', 'Estudiante', 'Ing. en Informática', 'vrojas@inacap.cl', 'Inacap2026', FALSE, 0),
('Sebastián Morales Cruz', '17.654.321-4', 'Estudiante', 'Administración de Empresas', 'smorales@inacap.cl', 'Inacap2026', FALSE, 0);

-- ==========================================
-- 4. INSERTAR LIBROS (12 en total)
-- ==========================================
INSERT INTO libros (titulo, autor, isbn, categoria, stock, disponible) VALUES
('Fundamentos de Programación', 'Luis Joyanes Aguilar', '978-970-10-6524-3', 'Informática', 5, 3),
('Cálculo: Una Variable', 'James Stewart', '978-607-526-309-7', 'Matemáticas', 8, 0),
('Contabilidad Financiera', 'Gerardo Guajardo Cantú', '978-607-15-0732-2', 'Contabilidad', 6, 4),
('Principios de Administración', 'Harold Koontz & Heinz Weihrich', '978-607-15-0578-6', 'Administración', 4, 2),
('Redes de Computadores', 'Andrew S. Tanenbaum', '978-970-26-0610-2', 'Informática', 3, 1),
('Física Universitaria Vol. 1', 'Hugh D. Young & Roger A. Freedman', '978-607-32-1745-9', 'Física', 7, 5),
('Fundamentos de Bases de Datos', 'Abraham Silberschatz', '978-84-481-7189-5', 'Informática', 5, 0),
('Marketing', 'Philip Kotler & Gary Armstrong', '978-607-32-2717-5', 'Administración', 6, 3),
('Estadística para Administración', 'Richard I. Levin & David S. Rubin', '978-970-26-0671-3', 'Matemáticas', 4, 2),
('Programación en Java', 'Paul Deitel & Harvey Deitel', '978-607-32-1572-1', 'Informática', 5, 4),
('Análisis y Diseño de Sistemas', 'Kenneth E. Kendall', '978-607-32-2196-8', 'Informática', 3, 1),
('Álgebra Lineal', 'Stanley I. Grossman', '978-970-10-6979-1', 'Matemáticas', 6, 3);

-- ==========================================
-- 5. INSERTAR PRÉSTAMOS DE EJEMPLO (10 en total)
-- ==========================================
-- Nota: Las fechas están en 2026. Los estados 'active' son a tiempo, 'overdue' atrasados, 'returned' devueltos.
INSERT INTO prestamos (usuario_id, libro_id, fecha_salida, fecha_devolucion, estado) VALUES
(1, 1, '2026-09-01', '2026-09-15', 'overdue'),   -- María (F. Programación)
(5, 5, '2026-09-05', '2026-09-19', 'active'),    -- Laura (Redes)
(2, 2, '2026-08-16', '2026-09-15', 'overdue'),   -- Carlos R. (Cálculo)
(3, 3, '2026-09-08', '2026-09-22', 'active'),    -- Admin (Contabilidad)
(4, 4, '2026-09-02', '2026-09-16', 'overdue'),   -- Pedro (Ppios. Admin)
(6, 6, '2026-08-16', '2026-09-15', 'active'),    -- Roberto (Física)
(1, 10, '2026-09-10', '2026-09-24', 'active'),   -- María (Java)
(2, 7, '2026-08-20', '2026-09-03', 'returned'),  -- Carlos R. (Base de Datos - ya devuelto)
(7, 8, '2026-09-12', '2026-09-26', 'active'),    -- Valentina (Marketing)
(6, 11, '2026-08-20', '2026-09-19', 'active');   -- Roberto (Análisis)