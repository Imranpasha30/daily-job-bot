import os
import sqlite3
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
cookie_path = os.path.join(BASE_DIR, '.user_browser_profile', 'Default', 'Network', 'Cookies')
storage_state_path = os.path.join(BASE_DIR, 'bot_storage_state.json')
user_data = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data')
local_state_file = os.path.join(user_data, 'Local State')

google_accounts = []
if os.path.exists(local_state_file):
    try:
        with open(local_state_file, 'r', encoding='utf-8') as f:
            ls = json.load(f)
            info = ls.get('profile', {}).get('info_cache', {})
            for p, d in info.items():
                u = d.get('user_name', '')
                n = d.get('name', '')
                g = d.get('gaia_name', '')
                if u:
                    google_accounts.append({'profile': p, 'email': u, 'name': n, 'gaia': g})
    except:
        pass

details = {
    'totalCookies': 0,
    'storagePath': cookie_path,
    'storageSizeBytes': os.path.getsize(cookie_path) if os.path.exists(cookie_path) else 0,
    'googleAccounts': google_accounts,
    'platforms': {},
    'topDomains': []
}

# 1. First inspect SQLite database if present
if os.path.exists(cookie_path):
    try:
        conn = sqlite3.connect(cookie_path)
        cur = conn.cursor()
        
        cur.execute("SELECT count(*) FROM cookies")
        details['totalCookies'] = cur.fetchone()[0]
        
        # Check LinkedIn
        cur.execute("SELECT name FROM cookies WHERE host_key LIKE '%linkedin%'")
        li_names = [r[0] for r in cur.fetchall()]
        has_li_session = 'li_at' in li_names
        details['platforms']['linkedin'] = {
            'count': len(li_names),
            'hasAuthSession': has_li_session,
            'status': '🟢 Fully Logged In (li_at Active)' if has_li_session else '🟡 Visitor Cookies Synced (Click "🔐 Open Browser" to Log In Once)',
            'sampleCookies': li_names[:6]
        }
        
        # Check Naukri
        cur.execute("SELECT name FROM cookies WHERE host_key LIKE '%naukri%'")
        nk_names = [r[0] for r in cur.fetchall()]
        has_nk_session = any(k in nk_names for k in ['naukri_user', 'user_id', 'profile_id', 'nauk_auth'])
        details['platforms']['naukri'] = {
            'count': len(nk_names),
            'hasAuthSession': has_nk_session,
            'status': '🟢 Fully Logged In' if has_nk_session else '🟡 Visitor Cookies Synced (Click "🔐 Open Browser" to Log In Once)',
            'sampleCookies': nk_names[:6]
        }
        
        # Check Google
        cur.execute("SELECT count(*) FROM cookies WHERE host_key LIKE '%google%'")
        g_count = cur.fetchone()[0]
        details['platforms']['google'] = {
            'count': g_count,
            'status': 'Authenticated' if g_count > 0 else 'Not Found',
            'activeEmail': 'imranpasha.ahmed@gmail.com',
            'candidate': 'Imran Pasha'
        }
        
        # Check GitHub
        cur.execute("SELECT count(*) FROM cookies WHERE host_key LIKE '%github%'")
        gh_count = cur.fetchone()[0]
        details['platforms']['github'] = {
            'count': gh_count,
            'status': 'Synced' if gh_count > 0 else 'Not Found'
        }
        
        # Top domains
        cur.execute("SELECT host_key, count(*) FROM cookies GROUP BY host_key ORDER BY count(*) DESC LIMIT 15")
        for h, c in cur.fetchall():
            details['topDomains'].append({'domain': h, 'cookies': c})
            
        conn.close()
    except Exception as e:
        details['error'] = str(e)

# 2. Check bot_storage_state.json for live Playwright session tokens
if os.path.exists(storage_state_path):
    try:
        with open(storage_state_path, 'r', encoding='utf-8') as f:
            st = json.load(f)
            st_cookies = st.get('cookies', [])
            if len(st_cookies) > details['totalCookies']:
                details['totalCookies'] = len(st_cookies)
                
            li_cookies = [c['name'] for c in st_cookies if 'linkedin' in c.get('domain', '')]
            nk_cookies = [c['name'] for c in st_cookies if 'naukri' in c.get('domain', '')]
            
            if 'li_at' in li_cookies:
                details['platforms']['linkedin'] = {
                    'count': max(details['platforms'].get('linkedin', {}).get('count', 0), len(li_cookies)),
                    'hasAuthSession': True,
                    'status': '🟢 Fully Logged In (li_at Active)',
                    'sampleCookies': li_cookies[:6]
                }
            if any(k in nk_cookies for k in ['naukri_user', 'user_id', 'profile_id', 'nauk_auth']):
                details['platforms']['naukri'] = {
                    'count': max(details['platforms'].get('naukri', {}).get('count', 0), len(nk_cookies)),
                    'hasAuthSession': True,
                    'status': '🟢 Fully Logged In',
                    'sampleCookies': nk_cookies[:6]
                }
    except Exception as e:
        pass

print(json.dumps(details, indent=2))
