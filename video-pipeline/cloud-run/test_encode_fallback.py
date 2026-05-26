"""
Testes do guard de autenticação do endpoint /process.

Garante que:
  1. Startup falha se WEBHOOK_SECRET não estiver setado.
  2. Request sem header Authorization recebe 401.
  3. Request com secret errado recebe 401.
  4. Request com secret correto passa o guard (chega no parsing do body).
"""

import importlib
import os
import sys
import types
import unittest
from unittest.mock import MagicMock, patch


def _load_app(secret: str):
    """
    Importa server.py num módulo isolado com WEBHOOK_SECRET definido.
    Usa importlib para permitir reimportação com variáveis diferentes.
    """
    env_patch = {
        'WEBHOOK_SECRET': secret,
        'R2_ENDPOINT': 'https://fake.r2.cloudflarestorage.com',
        'R2_ACCESS_KEY': 'fake-key',
        'R2_SECRET_KEY': 'fake-secret',
        'R2_BUCKET': 'fake-bucket',
        'BACKEND_API_URL': '',
        'VIDEO_WEBHOOK_SECRET': '',
        'R2_PUBLIC_URL': 'https://fake.r2.dev',
        'WHISPER_MODEL': 'tiny',
    }

    # Remover módulo anterior do cache para forçar reimportação
    sys.modules.pop('server', None)

    server_dir = os.path.dirname(os.path.abspath(__file__))
    if server_dir not in sys.path:
        sys.path.insert(0, server_dir)

    with patch.dict(os.environ, env_patch, clear=False):
        # Stub de dependências externas pesadas que podem não estar instaladas
        for mod_name in ('boto3', 'requests', 'flask'):
            if mod_name not in sys.modules:
                sys.modules[mod_name] = MagicMock()

        # Flask precisa ser real pra app.test_client() funcionar;
        # se não estiver disponível pulamos os testes de integração.
        try:
            import flask  # noqa: F401
            flask_real = True
        except ImportError:
            flask_real = False

        if not flask_real:
            return None, False

        import server  # noqa: E402
        return server.app, True


class TestWebhookSecretStartup(unittest.TestCase):
    """WEBHOOK_SECRET vazio deve causar RuntimeError no import."""

    def test_empty_secret_raises_on_import(self):
        sys.modules.pop('server', None)
        server_dir = os.path.dirname(os.path.abspath(__file__))
        if server_dir not in sys.path:
            sys.path.insert(0, server_dir)

        env_patch = {
            'WEBHOOK_SECRET': '',
            'R2_ENDPOINT': 'https://fake.r2.cloudflarestorage.com',
            'R2_ACCESS_KEY': '',
            'R2_SECRET_KEY': '',
            'R2_BUCKET': 'fake',
            'BACKEND_API_URL': '',
            'VIDEO_WEBHOOK_SECRET': '',
            'R2_PUBLIC_URL': 'https://fake.r2.dev',
            'WHISPER_MODEL': 'tiny',
        }

        for mod_name in ('boto3', 'requests'):
            if mod_name not in sys.modules:
                sys.modules[mod_name] = MagicMock()

        try:
            import flask  # noqa: F401
        except ImportError:
            self.skipTest("Flask não instalado — pulando teste de startup")

        with patch.dict(os.environ, env_patch, clear=False):
            with self.assertRaises(RuntimeError) as ctx:
                import server  # noqa: F401
            self.assertIn('WEBHOOK_SECRET', str(ctx.exception))

        sys.modules.pop('server', None)


class TestWebhookGuard(unittest.TestCase):
    """Guard de autenticação no endpoint /process."""

    @classmethod
    def setUpClass(cls):
        cls.secret = 'test-secret-abc123'
        app, ok = _load_app(cls.secret)
        if not ok:
            cls.client = None
        else:
            app.config['TESTING'] = True
            cls.client = app.test_client()

    def _skip_if_no_flask(self):
        if self.client is None:
            self.skipTest("Flask não instalado — pulando teste de guard")

    def test_no_auth_header_returns_401(self):
        self._skip_if_no_flask()
        resp = self.client.post('/process', json={'key': 'video/test.mp4'})
        self.assertEqual(resp.status_code, 401)

    def test_wrong_secret_returns_401(self):
        self._skip_if_no_flask()
        resp = self.client.post(
            '/process',
            json={'key': 'video/test.mp4'},
            headers={'Authorization': 'Bearer wrong-secret'},
        )
        self.assertEqual(resp.status_code, 401)

    def test_correct_secret_passes_guard(self):
        """Com secret correto o guard passa; pode falhar em 400/500 por body/deps,
        mas NÃO em 401."""
        self._skip_if_no_flask()
        with patch('server.process_video', side_effect=Exception("fake")):
            resp = self.client.post(
                '/process',
                json={'key': 'video/test.mp4'},
                headers={'Authorization': f'Bearer {self.secret}'},
            )
        self.assertNotEqual(resp.status_code, 401)

    def test_bearer_prefix_required(self):
        """Secret sem prefixo 'Bearer ' deve ser rejeitado."""
        self._skip_if_no_flask()
        resp = self.client.post(
            '/process',
            json={'key': 'video/test.mp4'},
            headers={'Authorization': self.secret},
        )
        self.assertEqual(resp.status_code, 401)


if __name__ == '__main__':
    unittest.main()
