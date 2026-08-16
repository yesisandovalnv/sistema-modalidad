from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.usuarios.models import Role


User = get_user_model()


class UserRoleAdminApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(codigo="ADMIN-API", nombre="AdministraciÃ³n API")
        cls.student_role = Role.objects.create(codigo="EST-API", nombre="Estudiante API")
        cls.admin = User.objects.create_user("api-admin", password="StrongPass-2026", is_staff=True, role=cls.admin_role)
        cls.student = User.objects.create_user("api-student", password="StrongPass-2026", role=cls.student_role)

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def test_admin_lists_searches_and_filters_users(self):
        response = self.client.get(reverse("user-admin-list"), {"search": "api-student", "role": self.student_role.id, "is_active": "true"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["username"], "api-student")
        self.assertNotIn("password", response.data["results"][0])

    def test_admin_creates_user_with_hashed_password_and_role(self):
        response = self.client.post(reverse("user-admin-list"), {"username": "new-user", "nombres": "Nueva", "role_id": self.student_role.id, "password": "StrongPass-2026", "is_active": True}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        created = User.all_objects.get(username="new-user")
        self.assertTrue(created.check_password("StrongPass-2026"))
        self.assertNotEqual(created.password, "StrongPass-2026")
        self.assertEqual(created.role, self.student_role)

    def test_admin_edits_role_and_deactivates_without_deleting(self):
        response = self.client.patch(reverse("user-admin-detail", args=[self.student.id]), {"role_id": self.admin_role.id, "is_active": False}, format="json")
        self.assertEqual(response.status_code, 200)
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, self.admin_role)
        self.assertFalse(self.student.is_active)
        self.assertFalse(self.student.activo)
        self.assertEqual(self.client.delete(reverse("user-admin-detail", args=[self.student.id])).status_code, 405)

    def test_roles_crud_and_used_role_protection(self):
        created = self.client.post(reverse("role-admin-list"), {"codigo": "TUTOR-API", "nombre": "Tutor API"}, format="json")
        self.assertEqual(created.status_code, 201)
        role_id = created.data["id"]
        self.assertEqual(self.client.patch(reverse("role-admin-detail", args=[role_id]), {"activo": False}, format="json").status_code, 200)
        protected = self.client.delete(reverse("role-admin-detail", args=[self.student_role.id]))
        self.assertEqual(protected.status_code, 400)

    def test_non_admin_and_anonymous_are_rejected(self):
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get(reverse("user-admin-list")).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("user-admin-list")).status_code, 401)

    def test_invalid_and_duplicate_fields_are_rejected(self):
        duplicate = self.client.post(reverse("user-admin-list"), {"username": "api-student", "password": "StrongPass-2026"}, format="json")
        self.assertEqual(duplicate.status_code, 400)
        invalid_email = self.client.post(reverse("user-admin-list"), {"username": "email-user", "password": "StrongPass-2026", "correo_institucional": "invalid"}, format="json")
        self.assertEqual(invalid_email.status_code, 400)
        invalid_role = self.client.post(reverse("user-admin-list"), {"username": "role-user", "password": "StrongPass-2026", "role_id": 999999}, format="json")
        self.assertEqual(invalid_role.status_code, 400)
