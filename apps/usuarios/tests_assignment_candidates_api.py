from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.usuarios.models import AuditLog, Role


User = get_user_model()


class AssignmentCandidateApiTests(APITestCase):
    endpoint = "/api/v1/usuarios/candidatos-asignacion/"

    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(codigo="ADMINISTRADOR", nombre="Administracion")
        cls.teacher_role = Role.objects.create(codigo="DOCENTE", nombre="Docente")
        cls.staff_role = Role.objects.create(codigo="PERSONAL", nombre="Personal academico")
        cls.student_role = Role.objects.create(codigo="ESTUDIANTE", nombre="Estudiante")
        cls.staff = User.objects.create_user(username="catalogo_staff", role=cls.admin_role, is_staff=True)
        cls.superuser = User.objects.create_user(username="catalogo_super", role=cls.admin_role, is_superuser=True)
        cls.teacher = User.objects.create_user(
            username="docente_seguro", role=cls.teacher_role, ru="DOC-001",
            nombres="Ana", apellido_paterno="Rojas",
            correo_personal="privado@example.com", telefono="70000000",
        )
        cls.personnel = User.objects.create_user(
            username="personal_seguro", role=cls.staff_role, nombres="Bruno", apellido_paterno="Zapata",
        )
        cls.student = User.objects.create_user(username="estudiante_fuera", role=cls.student_role, ru="EST-001")
        cls.inactive_login = User.objects.create_user(
            username="login_inactivo", role=cls.teacher_role, is_active=False,
        )
        cls.inactive_domain = User.objects.create_user(
            username="dominio_inactivo", role=cls.teacher_role, activo=False,
        )
        cls.without_role = User.objects.create_user(username="sin_rol")
        cls.actor = User.objects.create_user(username="actor_no_staff", role=cls.teacher_role)
        cls.unrelated = User.objects.create_user(username="ajeno_no_staff", role=cls.staff_role)

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def test_staff_receives_only_safe_fields_and_readable_labels(self):
        self.authenticate(self.staff)
        response = self.client.get(f"{self.endpoint}?search=DOC-001")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0], {
            "id": self.teacher.id,
            "username": "docente_seguro",
            "nombre_completo": "Ana Rojas",
            "codigo": "DOC-001",
            "rol_codigo": "DOCENTE",
            "rol_nombre": "Docente",
            "activo": True,
            "elegible": True,
            "motivo_bloqueo": None,
            "asignaciones_vigentes": [],
            "asignaciones_vigentes_detalle": [],
        })
        forbidden = {"password", "email", "correo_personal", "correo_institucional", "telefono", "ci", "direccion", "permisos", "token"}
        self.assertTrue(forbidden.isdisjoint(response.data["results"][0]))

    def test_superuser_can_access_catalog(self):
        self.authenticate(self.superuser)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 2)

    def test_non_staff_and_anonymous_permissions(self):
        for user in (self.student, self.actor, self.unrelated):
            self.authenticate(user)
            self.assertEqual(self.client.get(self.endpoint).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(self.endpoint).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_excludes_inactive_students_and_users_without_role(self):
        self.authenticate(self.staff)
        response = self.client.get(f"{self.endpoint}?ordering=username&page_size=100")
        usernames = {row["username"] for row in response.data["results"]}

        self.assertIn(self.teacher.username, usernames)
        self.assertIn(self.personnel.username, usernames)
        self.assertNotIn(self.student.username, usernames)
        self.assertNotIn(self.inactive_login.username, usernames)
        self.assertNotIn(self.inactive_domain.username, usernames)
        self.assertNotIn(self.without_role.username, usernames)

    def test_searches_name_username_and_safe_code_and_filters_role(self):
        self.authenticate(self.staff)
        for term in ("Ana", "docente_seguro", "DOC-001"):
            response = self.client.get(f"{self.endpoint}?search={term}")
            self.assertEqual(response.data["count"], 1)
            self.assertEqual(response.data["results"][0]["id"], self.teacher.id)

        role_response = self.client.get(f"{self.endpoint}?rol=personal")
        self.assertEqual(role_response.status_code, status.HTTP_200_OK)
        self.assertTrue(role_response.data["results"])
        self.assertEqual({row["rol_codigo"] for row in role_response.data["results"]}, {"PERSONAL"})

    def test_uses_standard_pagination_and_allowed_ordering(self):
        for index in range(21):
            User.objects.create_user(
                username=f"candidato_{index:02d}", role=self.teacher_role,
                nombres=f"Nombre {index:02d}",
            )
        self.authenticate(self.staff)

        first = self.client.get(f"{self.endpoint}?rol=DOCENTE&ordering=username")
        second = self.client.get(f"{self.endpoint}?rol=DOCENTE&ordering=username&page=2")

        self.assertEqual(first.data["count"], 23)
        self.assertEqual(len(first.data["results"]), 20)
        self.assertEqual(len(second.data["results"]), 3)
        usernames = [row["username"] for row in [*first.data["results"], *second.data["results"]]]
        self.assertEqual(usernames, sorted(usernames))

    def test_is_read_only_and_get_has_no_side_effects(self):
        self.authenticate(self.staff)
        audit_count = AuditLog.objects.count()
        before = list(User.all_objects.values_list("id", "is_active", "activo", "updated_at"))

        self.assertEqual(self.client.get(self.endpoint).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(f"{self.endpoint}{self.teacher.id}/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.post(self.endpoint, {}, format="json").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.patch(f"{self.endpoint}{self.teacher.id}/", {}, format="json").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(self.client.delete(f"{self.endpoint}{self.teacher.id}/").status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        self.assertEqual(AuditLog.objects.count(), audit_count)
        self.assertEqual(list(User.all_objects.values_list("id", "is_active", "activo", "updated_at")), before)
