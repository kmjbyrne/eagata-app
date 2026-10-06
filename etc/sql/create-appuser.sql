-- Creates the app's database user, allowed to read and write data but not to
-- change tables. Migrations use the migrator instead: the MARIADB_USER that
-- MariaDB creates on its first start, with every privilege on the database.
--
-- A template. `make app-user ENV=production`, after `make migrate`, fills in
-- APP_USER, APP_PASSWORD and APP_DATABASE from NUXT_DATABASE_URL, saves the
-- result to .out/production, and runs it as root inside the MariaDB container.
-- Safe to run again: it resets the password and the privileges.

CREATE USER IF NOT EXISTS 'APP_USER'@'%' IDENTIFIED BY 'APP_PASSWORD';
ALTER USER 'APP_USER'@'%' IDENTIFIED BY 'APP_PASSWORD';
-- GRANT only adds, so first drop anything the user had before.
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'APP_USER'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `APP_DATABASE`.* TO 'APP_USER'@'%';
