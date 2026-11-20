"""Offline checks. No Docker calls, settings imports, sockets, or SQL execution."""
import ast
from pathlib import Path

import yaml

directory = Path(__file__).resolve().parent
root = directory.parent.parent
compose = yaml.safe_load((directory / "compose.yml").read_text(encoding="utf-8"))
assert set(compose["services"]) == {"postgres-lab"}
service = compose["services"]["postgres-lab"]
assert service["ports"] == ["127.0.0.1:5542:5432"]
assert service["volumes"] == ["lab_data:/var/lib/postgresql/data", "./init:/docker-entrypoint-initdb.d:ro"]
assert set(compose["volumes"]) == {"lab_data"}
assert "external" not in compose["volumes"]["lab_data"]
assert compose["volumes"]["lab_data"]["name"].startswith("sm-runner-lab-${LAB_INSTANCE_ID:")
assert service["networks"] == ["lab_only"]
assert compose["networks"]["lab_only"]["internal"] is True
assert not any(key in service for key in ("depends_on", "network_mode", "privileged", "extra_hosts"))
assert set(service["secrets"]) == {"lab_admin_password", "lab_executor_password"}
assert service["environment"]["POSTGRES_PASSWORD_FILE"] == "/run/secrets/lab_admin_password"
for secret in compose["secrets"].values():
    assert secret["file"].startswith("./secrets.local/")
script = (directory / "init" / "10-lab-roles.sh").read_bytes()
assert b"\r" not in script, "Initialization must use LF"
assert b"--host=/var/run/postgresql --port=5432" in script
assert b"NOCREATEDB" in script and b"NOSUPERUSER" in script
assert b"GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system()" in script
settings_path = root / "settings_runner_lab.py"
tree = ast.parse(settings_path.read_text(encoding="utf-8"))
assert not any(isinstance(node, ast.ImportFrom) and node.module in ("core.settings", "settings_test")
               for node in ast.walk(tree))
texts = [(directory / "compose.yml").read_text(), script.decode(), settings_path.read_text()]
for text in texts:
    for forbidden in ("5540", "5541", "sistema_modalidad_data", "test_pgdata", "sistema_modalidad_test"):
        assert forbidden not in text, forbidden
print("PASS: Compose isolation, secret paths, local-only init, minimal roles, settings syntax.")
guard_tree = ast.parse((root / "testing_backend" / "guard.py").read_text(encoding="utf-8"))
profiles = next(ast.literal_eval(node.value) for node in guard_tree.body
                if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name)
                and target.id == "PROFILES" for target in node.targets))
assert profiles == {"legacy": ("127.0.0.1", "5541", "modalidad_test"),
                    "runner_lab": ("127.0.0.1", "5542", "lab_test_executor"),
                    "runner_lab_docker": ("postgres-lab", "5432", "lab_test_executor")}
assert "TEST_GUARD" in settings_path.read_text()
runner = yaml.safe_load((directory / 'compose.runner.yml').read_text())
service = runner['services']['runner']
assert set(runner['services']) == {'runner'}
assert service['networks'] == ['lab_only']
assert service['read_only'] and service['cap_drop'] == ['ALL']
assert service['user'] == '10001:10001'
assert service['secrets'] == ['lab_executor_password']
assert 'ports' not in service and 'privileged' not in service
assert runner['networks']['lab_only']['external'] is True
assert runner['networks']['lab_only']['name'].startswith('sm-runner-lab-${LAB_INSTANCE_ID:')
assert all(mount.endswith(':ro') and 'docker.sock' not in mount for mount in service['volumes'])
assert (directory / 'Dockerfile.runner.dockerignore').read_text().splitlines()[1] == '**'
print("PASS: three closed profiles; runner non-root, read-only, executor secret only, lab network only.")
