from django.test import SimpleTestCase

from apps.usuarios.models import AuditLog, CustomUser, Role


class RoleModelTest(SimpleTestCase):
    """Prueba básica para verificar la creación del modelo Role."""

    def test_role_can_be_instantiated_with_basic_fields(self):
        role = Role(codigo="ADM", nombre="Administrador", descripcion="Rol de administración")

        self.assertEqual(role.codigo, "ADM")
        self.assertEqual(role.nombre, "Administrador")
        self.assertEqual(role.descripcion, "Rol de administración")
        self.assertTrue(role.activo)


class CustomUserModelTest(SimpleTestCase):
    """Prueba básica para verificar la creación del modelo CustomUser."""

    def test_custom_user_can_be_instantiated_with_basic_fields(self):
        role = Role(codigo="DOC", nombre="Docente")
        user = CustomUser(
            username="jdoe",
            nombres="Jane",
            apellido_paterno="Doe",
            apellido_materno="Smith",
            ci="1234567",
            telefono="70123456",
            correo_personal="jane@example.com",
            ru="RU123456",
            role=role,
        )

        self.assertEqual(user.username, "jdoe")
        self.assertEqual(user.nombre_completo, "Jane Doe Smith")
        self.assertEqual(user.role, role)
        self.assertTrue(user.activo)


class AuditLogModelTest(SimpleTestCase):
    """Prueba básica para verificar la creación del modelo AuditLog."""

    def test_audit_log_can_be_instantiated_with_basic_fields(self):
        role = Role(codigo="ADM", nombre="Administrador")
        user = CustomUser(
            username="admin",
            nombres="Admin",
            apellido_paterno="System",
            apellido_materno="User",
            ci="7654321",
            telefono="70123456",
            correo_personal="admin@example.com",
            ru="RU654321",
            role=role,
        )
        audit_log = AuditLog(
            usuario=user,
            accion="LOGIN",
            modulo="Seguridad",
            descripcion="Inicio de sesión exitoso",
            ip_address="127.0.0.1",
            metodo_http="GET",
            url="/api/auth/login/",
        )

        self.assertEqual(audit_log.accion, "LOGIN")
        self.assertEqual(audit_log.modulo, "Seguridad")
        self.assertEqual(audit_log.usuario, user)
        self.assertTrue(audit_log.activo)
