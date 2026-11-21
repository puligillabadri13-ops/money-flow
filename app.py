import os
import json
import mimetypes
import hashlib
import secrets
from urllib.parse import urlparse
from wsgiref.simple_server import make_server, WSGIServer
from socketserver import ThreadingMixIn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data.json')
DEFAULT_CATEGORIES = ['Travel', 'Household', 'Food', 'Entertainment']

def hash_password(password, salt=None):
    if not salt:
        salt = secrets.token_hex(8)
    h = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return f"{salt}${h}"

def verify_password(password, stored_hash):
    if not stored_hash or '$' not in stored_hash:
        return False
    try:
        salt, h = stored_hash.split('$', 1)
        expected = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
        return h == expected
    except Exception:
        return False

def get_default_user_state(username="User"):
    return {
        "username": username,
        "password_hash": "",
        "avatar": "",
        "balance": 0.0,
        "expenses": {cat: [] for cat in DEFAULT_CATEGORIES}
    }

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    # Check if multi-user schema
                    if "users" in data:
                        if "sessions" not in data:
                            data["sessions"] = {}
                        return data
                    # Migrate legacy single-user state if present
                    if "expenses" in data:
                        return {
                            "users": {
                                "default": {
                                    "username": "User",
                                    "password_hash": hash_password("password123"),
                                    "avatar": "",
                                    "balance": float(data.get("balance", 0.0)),
                                    "expenses": data.get("expenses", {cat: [] for cat in DEFAULT_CATEGORIES})
                                }
                            },
                            "sessions": {}
                        }
        except Exception as e:
            print(f"Warning: Could not load data.json: {e}")
    return {"users": {}, "sessions": {}}

def save_data(d):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving data: {e}")

db = load_data()

def get_user_from_environ(environ):
    token = None
    auth_header = environ.get('HTTP_AUTHORIZATION') or ''
    if auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
    if not token:
        token = environ.get('HTTP_X_AUTH_TOKEN')
    if not token:
        return None, None

    user_key = db.get("sessions", {}).get(token)
    if user_key and user_key in db.get("users", {}):
        return token, db["users"][user_key]
    return token, None

def handle_api(path, method, body, environ):
    global db

    # ─── Auth Endpoints ──────────────────────────────
    if path == '/api/auth/register' and method == 'POST':
        username = (body.get('username') or '').strip()
        password = (body.get('password') or '').strip()

        if len(username) < 2:
            return 400, {'error': 'Username must be at least 2 characters.'}
        if len(password) < 3:
            return 400, {'error': 'Password must be at least 3 characters.'}

        key = username.lower()
        if key in db['users']:
            return 400, {'error': 'Username is already registered. Please sign in instead.'}

        new_user = {
            "username": username,
            "password_hash": hash_password(password),
            "avatar": "",
            "balance": 0.0,
            "expenses": {cat: [] for cat in DEFAULT_CATEGORIES}
        }
        db['users'][key] = new_user

        token = secrets.token_hex(24)
        db['sessions'][token] = key
        save_data(db)

        return 200, {
            'success': True,
            'token': token,
            'username': username,
            'avatar': '',
            'state': {
                'balance': 0.0,
                'expenses': new_user['expenses']
            }
        }

    if path == '/api/auth/login' and method == 'POST':
        username = (body.get('username') or '').strip()
        password = (body.get('password') or '').strip()

        if not username or not password:
            return 400, {'error': 'Please enter both username and password.'}

        key = username.lower()
        if key not in db['users']:
            return 401, {'error': 'No account found with that username. Please create an account.'}

        user = db['users'][key]
        if not verify_password(password, user.get('password_hash', '')):
            return 401, {'error': 'Incorrect password. Please try again.'}

        token = secrets.token_hex(24)
        db['sessions'][token] = key
        save_data(db)

        return 200, {
            'success': True,
            'token': token,
            'username': user['username'],
            'avatar': user.get('avatar', ''),
            'state': {
                'balance': user.get('balance', 0.0),
                'expenses': user.get('expenses', {})
            }
        }

    if path == '/api/auth/logout' and method == 'POST':
        token, _ = get_user_from_environ(environ)
        if token and token in db.get('sessions', {}):
            del db['sessions'][token]
            save_data(db)
        return 200, {'success': True}

    # ─── Authenticated User Routes ────────────────────
    token, user = get_user_from_environ(environ)

    # Fallback: if no users registered yet, support legacy/demo session
    if not user:
        # Check if single default user exists or create guest session
        if not db['users']:
            guest_user = get_default_user_state("Guest")
            db['users']['guest'] = guest_user
            token = secrets.token_hex(24)
            db['sessions'][token] = 'guest'
            save_data(db)
            user = guest_user
        else:
            return 401, {'error': 'Unauthorized. Please sign in.'}

    # Current user state bundle
    def get_user_response():
        return {
            'username': user['username'],
            'avatar': user.get('avatar', ''),
            'balance': user.get('balance', 0.0),
            'expenses': user.get('expenses', {})
        }

    if path == '/api/state' and method == 'GET':
        return 200, get_user_response()

    if method == 'POST':
        if path == '/api/balance':
            try:
                b = float(body.get('balance', 0))
                user['balance'] = max(0.0, b)
                save_data(db)
                return 200, get_user_response()
            except (ValueError, TypeError):
                return 400, {'error': 'Invalid balance amount'}

        elif path == '/api/category':
            name = (body.get('name') or '').strip()
            if name and name not in user['expenses']:
                user['expenses'][name] = []
                save_data(db)
            return 200, get_user_response()

        elif path == '/api/category/delete':
            name = (body.get('name') or '').strip()
            if name in user['expenses']:
                del user['expenses'][name]
                save_data(db)
            return 200, get_user_response()

        elif path == '/api/add':
            cat = body.get('category')
            item = (body.get('item') or '').strip()
            date = body.get('date')
            if not date:
                from datetime import datetime
                date = datetime.now().strftime('%Y-%m-%d')
            try:
                price = float(body.get('price', 0))
            except (ValueError, TypeError):
                return 400, {'error': 'Invalid price'}

            if not cat or not item or price <= 0:
                return 400, {'error': 'Invalid expense data'}

            if cat not in user['expenses']:
                user['expenses'][cat] = []
            user['expenses'][cat].append({'name': item, 'price': price, 'date': date})
            save_data(db)
            return 200, get_user_response()

        elif path == '/api/delete':
            cat = body.get('category')
            idx = body.get('index')
            if cat in user['expenses'] and isinstance(idx, int):
                items = user['expenses'][cat]
                if 0 <= idx < len(items):
                    items.pop(idx)
                    save_data(db)
            return 200, get_user_response()

        elif path == '/api/avatar':
            avatar = body.get('avatar', '')
            user['avatar'] = avatar
            save_data(db)
            return 200, get_user_response()

        elif path == '/api/reset':
            user['balance'] = 0.0
            user['expenses'] = {cat: [] for cat in DEFAULT_CATEGORIES}
            save_data(db)
            return 200, get_user_response()

    return 404, {'error': 'Not found'}

def app(environ, start_response):
    """WSGI standard application (compatible with Gunicorn and Python built-in server)"""
    path = urlparse(environ.get('PATH_INFO', '')).path
    method = environ.get('REQUEST_METHOD', 'GET').upper()

    # CORS & Common headers
    base_headers = [
        ('Access-Control-Allow-Origin', '*'),
        ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
        ('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token'),
    ]

    if method == 'OPTIONS':
        start_response('200 OK', base_headers)
        return [b'']

    # Route: /
    if path in ('/', ''):
        file_path = os.path.join(BASE_DIR, 'index.html')
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                content = f.read()
            headers = base_headers + [
                ('Content-Type', 'text/html; charset=utf-8'),
                ('Content-Length', str(len(content))),
                ('Content-Disposition', 'inline; filename=index.html')
            ]
            start_response('200 OK', headers)
            return [content]

    # Route: /tracker
    if path in ('/tracker', '/tracker.html', '/index.html'):
        file_path = os.path.join(BASE_DIR, 'index.html')
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                content = f.read()
            headers = base_headers + [
                ('Content-Type', 'text/html; charset=utf-8'),
                ('Content-Length', str(len(content))),
                ('Content-Disposition', 'inline; filename=index.html')
            ]
            start_response('200 OK', headers)
            return [content]

    # API Routes: /api/...
    if path.startswith('/api/'):
        body = {}
        if method == 'POST':
            try:
                content_length = int(environ.get('CONTENT_LENGTH') or 0)
            except ValueError:
                content_length = 0
            if content_length > 0:
                raw_body = environ['wsgi.input'].read(content_length)
                try:
                    body = json.loads(raw_body.decode('utf-8'))
                except Exception:
                    body = {}

        status_code, resp_data = handle_api(path, method, body, environ)
        status_text = '200 OK' if status_code == 200 else ('400 Bad Request' if status_code == 400 else ('401 Unauthorized' if status_code == 401 else '404 Not Found'))
        resp_bytes = json.dumps(resp_data, ensure_ascii=False).encode('utf-8')
        headers = base_headers + [
            ('Content-Type', 'application/json; charset=utf-8'),
            ('Content-Length', str(len(resp_bytes)))
        ]
        start_response(status_text, headers)
        return [resp_bytes]

    # Static file serving fallback
    safe_path = os.path.normpath(os.path.join(BASE_DIR, path.lstrip('/\\')))
    if safe_path.startswith(BASE_DIR) and os.path.isfile(safe_path):
        mime, _ = mimetypes.guess_type(safe_path)
        with open(safe_path, 'rb') as f:
            content = f.read()
        headers = base_headers + [
            ('Content-Type', mime or 'application/octet-stream'),
            ('Content-Length', str(len(content)))
        ]
        start_response('200 OK', headers)
        return [content]

    # 404
    not_found = b'<!doctype html><html lang=en><title>404 Not Found</title><h1>Not Found</h1>'
    headers = base_headers + [
        ('Content-Type', 'text/html; charset=utf-8'),
        ('Content-Length', str(len(not_found)))
    ]
    start_response('404 Not Found', headers)
    return [not_found]

class ThreadingWSGIServer(ThreadingMixIn, WSGIServer):
    daemon_threads = True

def run_server(port=5000):
    host = '0.0.0.0'
    server = make_server(host, port, app, server_class=ThreadingWSGIServer)
    print(f"MoneyFlow server running on http://127.0.0.1:{port}")
    print(f"Press Ctrl+C to stop.")
    server.serve_forever()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    run_server(port)
