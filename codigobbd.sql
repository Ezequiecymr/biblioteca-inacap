-- MySQL dump 10.13  Distrib 8.4.7, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: biblioteca_inacap
-- ------------------------------------------------------
-- Server version	8.4.7

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `biblioteca_inacap`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `biblioteca_inacap` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `biblioteca_inacap`;

--
-- Table structure for table `libros`
--

DROP TABLE IF EXISTS `libros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `libros` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `autor` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isbn` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `categoria` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stock` int NOT NULL,
  `disponible` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `libros`
--

LOCK TABLES `libros` WRITE;
/*!40000 ALTER TABLE `libros` DISABLE KEYS */;
INSERT INTO `libros` VALUES (1,'Fundamentos de Programación','Luis Joyanes Aguilar','978-970-10-6524-3','Informática',5,4),(2,'Cálculo: Una Variable','James Stewart','978-607-526-309-7','Matemáticas',8,8),(3,'Contabilidad Financiera','Gerardo Guajardo Cantú','978-607-15-0732-2','Contabilidad',6,6),(4,'Principios de Administración','Harold Koontz & Heinz Weihrich','978-607-15-0578-6','Administración',4,4),(5,'Redes de Computadores','Andrew S. Tanenbaum','978-970-26-0610-2','Informática',3,3),(6,'Física Universitaria Vol. 1','Hugh D. Young & Roger A. Freedman','978-607-32-1745-9','Física',7,7),(7,'Fundamentos de Bases de Datos','Abraham Silberschatz','978-84-481-7189-5','Informática',5,5),(8,'Marketing','Philip Kotler & Gary Armstrong','978-607-32-2717-5','Administración',6,6),(9,'Estadística para Administración','Richard I. Levin & David S. Rubin','978-970-26-0671-3','Matemáticas',4,4),(10,'Programación en Java','Paul Deitel & Harvey Deitel','978-607-32-1572-1','Informática',5,5),(11,'Análisis y Diseño de Sistemas','Kenneth E. Kendall','978-607-32-2196-8','Informática',3,3),(12,'Álgebra Lineal','Stanley I. Grossman','978-970-10-6979-1','Matemáticas',6,6),(13,'Arquitectura de Computadores','William Stallings','978-607-32-2707-6','Informática',4,4),(14,'Introducción a la Inteligencia Artificial','Stuart Russell','978-607-32-2488-4','Informática',3,3),(15,'Química General','Raymond Chang','978-607-15-0412-8','Química',5,5),(16,'Derecho Empresarial','Miguel Ángel Rodríguez','978-956-31-0123-4','Derecho',3,3),(17,'Ingles Tecnico','John Eastwood','978-019-436-922-0','Idiomas',4,4),(18,'Biología Molecular','Harvey Lodish','978-030-640-615-7','Biología',3,3),(19,'Fundamentos de Psicología','David G. Myers','978-849-035-303-5','Psicología',4,4),(20,'Historia de Chile','Luis Galdames','978-956-112-523-0','Historia',3,3),(21,'El señor de los anillos','JUAN DE DIOS','978-84-253-6316-0','ficcion',5,5);
/*!40000 ALTER TABLE `libros` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `multas_simuladas`
--

DROP TABLE IF EXISTS `multas_simuladas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `multas_simuladas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prestamo_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `dias_retraso` int NOT NULL,
  `monto` int NOT NULL,
  `pagada` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `prestamo_id` (`prestamo_id`),
  KEY `usuario_id` (`usuario_id`)
) ENGINE=MyISAM AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `multas_simuladas`
--

LOCK TABLES `multas_simuladas` WRITE;
/*!40000 ALTER TABLE `multas_simuladas` DISABLE KEYS */;
INSERT INTO `multas_simuladas` VALUES (20,28,1,16,8000,0);
/*!40000 ALTER TABLE `multas_simuladas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prestamos`
--

DROP TABLE IF EXISTS `prestamos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prestamos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `libro_id` int NOT NULL,
  `fecha_salida` date NOT NULL,
  `fecha_devolucion` date NOT NULL,
  `estado` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `libro_id` (`libro_id`)
) ENGINE=MyISAM AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prestamos`
--

LOCK TABLES `prestamos` WRITE;
/*!40000 ALTER TABLE `prestamos` DISABLE KEYS */;
INSERT INTO `prestamos` VALUES (1,1,1,'2026-09-01','2026-09-15','returned'),(2,5,5,'2026-09-05','2026-09-19','returned'),(3,2,2,'2026-08-16','2026-09-15','returned'),(4,3,3,'2026-09-08','2026-09-22','returned'),(5,4,4,'2026-09-02','2026-09-16','returned'),(6,6,6,'2026-08-16','2026-09-15','returned'),(7,1,10,'2026-09-10','2026-09-24','returned'),(8,2,7,'2026-08-20','2026-09-03','returned'),(9,7,8,'2026-09-12','2026-09-26','returned'),(10,6,11,'2026-08-20','2026-09-19','returned'),(11,1,1,'2026-11-20','2026-12-04','returned'),(12,1,1,'2026-11-20','2026-12-04','returned'),(13,1,1,'2026-11-20','2026-12-04','returned'),(14,1,1,'2026-11-20','2026-12-04','returned'),(15,1,1,'2026-11-22','2026-12-06','returned'),(16,1,1,'2026-11-22','2026-12-06','returned'),(17,1,1,'2026-11-22','2026-12-06','returned'),(18,1,1,'2026-11-22','2026-12-06','returned'),(19,1,1,'2026-11-22','2026-12-06','returned'),(20,1,1,'2026-11-22','2026-12-06','returned'),(21,1,1,'2026-11-22','2026-12-06','returned'),(22,12,1,'2026-11-22','2026-12-06','returned'),(23,12,1,'2026-11-22','2026-12-06','returned'),(24,12,1,'2026-11-22','2026-12-06','returned'),(25,11,1,'2026-11-22','2026-12-06','returned'),(26,11,1,'2026-11-22','2026-12-06','returned'),(27,11,1,'2026-11-23','2026-12-07','returned'),(28,1,1,'2026-12-09','2026-12-23','overdue');
/*!40000 ALTER TABLE `prestamos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prestamos_atrasos_simulados`
--

DROP TABLE IF EXISTS `prestamos_atrasos_simulados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prestamos_atrasos_simulados` (
  `prestamo_id` int NOT NULL,
  PRIMARY KEY (`prestamo_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prestamos_atrasos_simulados`
--

LOCK TABLES `prestamos_atrasos_simulados` WRITE;
/*!40000 ALTER TABLE `prestamos_atrasos_simulados` DISABLE KEYS */;
INSERT INTO `prestamos_atrasos_simulados` VALUES (28);
/*!40000 ALTER TABLE `prestamos_atrasos_simulados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tiempo_simulacion`
--

DROP TABLE IF EXISTS `tiempo_simulacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiempo_simulacion` (
  `id` tinyint NOT NULL,
  `fecha_actual` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tiempo_simulacion`
--

LOCK TABLES `tiempo_simulacion` WRITE;
/*!40000 ALTER TABLE `tiempo_simulacion` DISABLE KEYS */;
INSERT INTO `tiempo_simulacion` VALUES (1,'2027-01-08');
/*!40000 ALTER TABLE `tiempo_simulacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rut` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `area` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `intentos_fallidos` int NOT NULL DEFAULT '0',
  `deuda` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `rut` (`rut`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'María González López','12.345.678-9','Estudiante','Ing. en Informática','mgonzalez@inacap.cl','$2y$10$7aBr3UnCRUjOYNUJZrL2nuVj58PLXZMLtHEtwy1j0ByyLWbMYBvPe',0,1),(2,'Carlos Rodríguez Muñoz','15.234.567-8','Estudiante','Administración de Empresas','crodriguez@inacap.cl','$2y$10$EyawGrPJicayvcgyV.fmOObCqyWANj9rz/GsbT99m1VHGm.WQJE1i',0,0),(3,'Carlos Rojas (TI)','18.765.432-1','Administrador','Dirección de Informática','admin@inacap.cl','$2y$10$YKxr1a7AQ5jz1fjpWyZYVO7Lz9H13fAoFI1VDwwSxe0ZLg2SUNitq',0,0),(4,'Pedro Soto Vega','14.321.654-K','Estudiante','Diseño Gráfico Digital','psoto@inacap.cl','$2y$10$tjQMueMFx5B.dNxYfJRET.rjsQqKVw9sVWXdD4AlHrZwPHUoU9CJC',0,0),(5,'Laura Pérez Castillo','16.543.210-2','Estudiante','Contabilidad General','lperez@inacap.cl','$2y$10$KDHolmwjbtWWFUq6Iz4d7.aDQh5imMkvB.ls/QpiWowwNDOXbQbi6',0,1),(6,'Roberto Díaz Torres','13.456.789-3','Bibliotecario','Ciencias Exactas','rdiaz@inacap.cl','$2y$10$vOXx8Uot6f91CPV2o3LR5.sFtFT0Vj2OacXiNO4jwd.Wk8BEfttei',0,0),(7,'Valentina Rojas Fuentes','19.876.543-2','Estudiante','Ing. en Informática','vrojas@inacap.cl','$2y$10$ruUvbmDZQucavzqx950f4uZW7R/I3ZcxSXzNp4MUt7O/sycC9/aW.',0,0),(8,'Sebastián Morales Cruz','17.654.321-4','Estudiante','Administración de Empresas','smorales@inacap.cl','$2y$10$XeqKMZ2OjhTltp2h1exrqOQUP.yoECb2aY0krq9GN1W9nX7YORCTO',0,0),(9,'Benjamin Carmona','21.959.316-3','Estudiante','informatica','benja@inacap.cl','$2y$10$WspMDB7VdFo1kAQbsbuuKeZMFaaqFm5yLpE2I4e54295ELII.0eZ.',0,0),(10,'Mateo Matus','12.345.678-5','Estudiante','informatica','mateo@inacap.cl','$2y$10$9gcOvX5f/KfmhbNd5cCqoeSwg9JVyhuqvRcuLRt.FPj5fs5qkbNiW',0,0),(11,'Tamar Muñoz','18.765.432-7','Estudiante','Terapia Ocupacional','tamar@inacap.cl','$2y$10$mKls.G1AiZqkWVSDja/ryev7fbgZlkQDFG6Zg86BRNClRLa1DkZEy',0,0),(12,'Andrea Copilot','22.222.222-2','Estudiante','Prueba segura','andrea.copilot@inacap.cl','$2y$10$fkMD.xwk5nV1N1Isf1f7puaX1k6sIpb0.GJbFiImk1TZhKFCK7FYW',0,0),(13,'asd','22.627.184-8','Estudiante','informatica','benja1@inacap.cl','$2y$10$vzmmdnvNoMkzoJ6RCCne5udTHnJBYwBGHyiX3tQA.gBux22g.h2XC',3,0);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios_deuda_simulada`
--

DROP TABLE IF EXISTS `usuarios_deuda_simulada`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios_deuda_simulada` (
  `usuario_id` int NOT NULL,
  PRIMARY KEY (`usuario_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios_deuda_simulada`
--

LOCK TABLES `usuarios_deuda_simulada` WRITE;
/*!40000 ALTER TABLE `usuarios_deuda_simulada` DISABLE KEYS */;
INSERT INTO `usuarios_deuda_simulada` VALUES (1);
/*!40000 ALTER TABLE `usuarios_deuda_simulada` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-25 19:51:48
