from rest_framework.test import APITestCase

from apps.usuarios.models import CustomUser, Role


class StudentOptionApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(codigo="ADMIN", nombre="Administración")
        cls.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.admin = CustomUser.objects.create_user(username="selector-admin", role=cls.admin_role, is_staff=True)
        cls.student = CustomUser.objects.create_user(
            username="selector-student", role=cls.student_role, ru="394090", ci="1234567",
            nombres="Luis Fernando", apellido_paterno="Menacho", apellido_materno="Melgar",
        )

    def test_lists_safe_student_representation_and_searches(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/v1/usuarios/estudiantes/?search=394090")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0], {
            "id": self.student.id, "codigo": "394090", "ru": "394090", "ci": "1234567",
            "nombre_completo": "Luis Fernando Menacho Melgar",
        })

    def test_student_without_management_permission_is_forbidden(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get("/api/v1/usuarios/estudiantes/").status_code, 403)

    def test_legacy_auth_route_remains_compatible(self):
        self.client.force_authenticate(self.admin)
        canonical = self.client.get("/api/v1/usuarios/estudiantes/?search=394090")
        legacy = self.client.get("/api/v1/auth/estudiantes/?search=394090")
        self.assertEqual(legacy.status_code, 200)
        self.assertEqual(legacy.data, canonical.data)
