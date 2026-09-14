#!/usr/bin/env python3
"""
test_biomechanics.py — Geautomatiseerde Biomechanische & Veterinaire Validatie Runner
Wageningen University & Research — Next Level Animal Science

Verbindt via Chrome DevTools Protocol (CDP) met de actieve simulatie en toetst
het 3D-koemodel op 6 veterinaire biomechanische invarianten:
1. Grondpenetratie (Klauwhoogte)
2. Gewrichtshoeken (ROM, hyperextensie)
3. Mediale klauwklaring (Geen scharende gang)
4. Sagittale gangwerksymmetrie (Links vs Rechts paslengte)
5. Pootvrijwaring bij extreme overconditie (BCS 5.0 + dracht)
6. Sprecher (1997) klinische kreupelheidsinvarianten
"""

import sys
import json
import urllib.request
import websocket

CDP_PORT = 9222
HTTP_PORT = 8765

def get_page_ws_url():
    try:
        targets_raw = urllib.request.urlopen(f'http://localhost:{CDP_PORT}/json', timeout=3).read()
        targets = json.loads(targets_raw)
        pages = [t for t in targets if t.get('type') == 'page']
        if not pages:
            print("❌ Geen actieve browserpagina gevonden op poort", CDP_PORT)
            sys.exit(1)
        return pages[0]['webSocketDebuggerUrl']
    except Exception as e:
        print(f"❌ Kan geen verbinding maken met Chrome CDP op poort {CDP_PORT}: {e}")
        sys.exit(1)

def run_tests():
    print("=" * 78)
    print("🐄 WUR NLAS — GEAUTOMATISEERDE BIOMECHANISCHE VALIDATIETESTS")
    print("=" * 78)

    ws_url = get_page_ws_url()
    ws = websocket.create_connection(ws_url, suppress_origin=True)

    # Herlaad de browserpagina om de allernieuwste code te laden
    ws.send(json.dumps({'id': 1, 'method': 'Page.reload', 'params': {}}))
    import time
    time.sleep(1.2)

    # Voer import en validatie uit in browser context
    js_runner = """
    (async () => {
        try {
            if (!window.app || !window.app.behavior) {
                return { error: 'Simulator nog niet gereed (window.app.behavior ontbreekt).' };
            }
            const { BiomechanicalValidator } = await import('./js/tests/BiomechanicalValidator.js?v=' + Date.now());
            const report = await BiomechanicalValidator.runFullValidation(window.app.behavior);
            return { report };
        } catch (err) {
            return { error: err.stack || err.message };
        }
    })()
    """

    req = {
        'id': 100,
        'method': 'Runtime.evaluate',
        'params': {
            'expression': js_runner,
            'awaitPromise': True,
            'returnByValue': True
        }
    }

    ws.send(json.dumps(req))
    raw_res = None
    while True:
        msg = json.loads(ws.recv())
        if msg.get('id') == 100:
            raw_res = msg.get('result', {}).get('result', {}).get('value')
            break
    ws.close()

    if not raw_res:
        print("❌ Geen resultaat ontvangen van browser.")
        sys.exit(1)

    if 'error' in raw_res:
        print(f"❌ Fout tijdens testuitvoering: {raw_res['error']}")
        sys.exit(1)

    report = raw_res.get('report')
    if not report:
        print("❌ Geen rapport gegenereerd.")
        sys.exit(1)

    suites = report.get('suites', [])
    total = report.get('totalSuites', len(suites))
    passed_count = report.get('passedSuites', 0)
    failed_count = report.get('failedSuites', 0)

    for i, s in enumerate(suites, 1):
        status_sym = "✅ PASS" if s.get('passed') else "❌ FAIL"
        print(f"\n[{i}/{total}] {status_sym} — {s.get('title')}")
        print(f"      Toelichting : {s.get('verdict')}")
        if 'threshold' in s:
            print(f"      Grenswaarde : {s.get('threshold')}")
        if 'measured' in s:
            print("      Metingen    :")
            for k, v in s['measured'].items():
                print(f"        • {k:22}: {v}")

    print("\n" + "=" * 78)
    print(f"EINDRESULTAAT: {passed_count}/{total} suites geslaagd | {failed_count} mislukt")
    print(f"Gevalideerd op: {report.get('timestamp')}")
    print("=" * 78)

    if report.get('overallPassed'):
        print("🎉 ALLE BIOMECHANISCHE INVARIANTEN SUCCESVOL GEVALIDEERD!")
        sys.exit(0)
    else:
        print("⚠️ ÉÉN OF MEER BIOMECHANISCHE INVARIANTEN ZIJN OVERSCHREDEN!")
        sys.exit(1)

if __name__ == '__main__':
    run_tests()
