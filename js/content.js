// content.js — data: technology tree, built-in pages, search index, HTML helpers
// Pre-built pages restored from the original net-hub.html.

// ── TREE ─────────────────────────────────────────────────────
const TREE=[
  {id:'cisco',label:'Cisco',col:'#9b80f8',subs:[
    {id:'aci',label:'ACI',pages:[{id:'moquery',label:'moquery'},{id:'tshoot',label:'Troubleshoot'},{id:'theory',label:'Theory'}]},
    {id:'iosxe',label:'IOS XE / XR',pages:[{id:'routing',label:'Routing'},{id:'debug',label:'Debug & Show'}]},
    {id:'asa',label:'ASA Firewall',pages:[{id:'debug',label:'FW Debug'},{id:'theory',label:'Theory & Objects'}]},
    {id:'vpn',label:'VPN / IPsec',pages:[{id:'setup',label:'Setup'},{id:'debug',label:'Debug'},{id:'theory',label:'Theory'}]},
  ]},
  {id:'f5',label:'F5 BIG-IP',col:'#00bfa0',subs:[
    {id:'ltm',label:'BIG-IP LTM',pages:[{id:'workflow',label:'Provisioning'},{id:'monitors',label:'HTTPS Monitors'},{id:'cli',label:'CLI Reference'}]},
    {id:'logs',label:'Logs & Debug',pages:[{id:'ltm',label:'LTM Logs'},{id:'certs',label:'Certificates'}]},
    {id:'apm',label:'APM / SSL-VPN',pages:[{id:'setup',label:'Setup'},{id:'debug',label:'Debug'}]},
  ]},
  {id:'checkpoint',label:'Checkpoint',col:'#e84444',subs:[
    {id:'gw',label:'Gateway / Mgmt',pages:[{id:'policy',label:'Policy'},{id:'objects',label:'Objects'},{id:'tshoot',label:'Troubleshoot'}]},
    {id:'vpn',label:'VPN',pages:[{id:'setup',label:'Setup'},{id:'debug',label:'Debug'}]},
  ]},
  {id:'fortinet',label:'Fortinet',col:'#f0980a',subs:[
    {id:'fg',label:'FortiGate FW',pages:[{id:'policy',label:'Policy & NAT'},{id:'tshoot',label:'Troubleshoot'}]},
    {id:'vpn',label:'VPN',pages:[{id:'ipsec',label:'IPsec VPN'},{id:'ssl',label:'SSL-VPN'}]},
    {id:'cli',label:'CLI Reference',pages:[{id:'commands',label:'Commands'}]},
  ]},
  {id:'paloalto',label:'Palo Alto',col:'#56a0f0',subs:[
    {id:'policy',label:'Policies',pages:[{id:'security',label:'Security Policy'},{id:'nat',label:'NAT'},{id:'qos',label:'QoS'}]},
    {id:'vpn',label:'VPN',pages:[{id:'ipsec',label:'IPsec'},{id:'gp',label:'GlobalProtect'}]},
    {id:'panorama',label:'Panorama',pages:[{id:'setup',label:'Setup'},{id:'mgmt',label:'Management'}]},
  ]},
  {id:'theory',label:'General / RFCs',col:'#30c97a',subs:[
    {id:'routing',label:'Routing Protocols',pages:[{id:'bgp',label:'BGP'},{id:'ospf',label:'OSPF'},{id:'isis',label:'IS-IS'}]},
    {id:'security',label:'Network Security',pages:[{id:'tls',label:'TLS / SSL'},{id:'aaa',label:'AAA & RADIUS'},{id:'acls',label:'ACLs'}]},
    {id:'rfcs',label:'Key RFCs',pages:[{id:'list',label:'RFC Reference'}]},
  ]},
];

// ── STATE ────────────────────────────────────────────────────

// ── HELPERS ──────────────────────────────────────────────────
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function cb(lang,code){return'<div class="cb"><div class="ch"><span class="cl">'+lang+'</span><button class="cp" onclick="cpCode(this)">copy</button></div><pre>'+esc(code.trim())+'</pre></div>'}
function co(type,icon,title,body){return'<div class="co co-'+type+'"><div class="co-i">'+icon+'</div><div class="co-b"><strong>'+title+'</strong><p>'+body+'</p></div></div>'}
function tbl(hdrs,rows){return'<div class="tw"><table><thead><tr>'+hdrs.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}
function tag(cls,txt){return'<span class="tag '+cls+'">'+txt+'</span>'}
function cpCode(btn){const t=btn.closest('.cb').querySelector('pre').textContent;navigator.clipboard.writeText(t).then(()=>{btn.textContent='✓';btn.classList.add('ok');setTimeout(()=>{btn.textContent='copy';btn.classList.remove('ok')},1800)})}

// ── SEARCH ───────────────────────────────────────────────────
const IDX=[
  {t:'IKEv2 peer IP change — setup',p:'cisco/vpn/setup',k:'cisco asa ikev2 peer ip crypto map tunnel-group',v:'Change peer IP: crypto map + tunnel-group recreate on ASA'},
  {t:'clear crypto ikev2 sa',p:'cisco/vpn/debug',k:'clear crypto ikev2 sa peer ghost stale',v:'Clear stale IKEv2 SA after peer IP change'},
  {t:'IKEv2 debug commands',p:'cisco/vpn/debug',k:'debug crypto ikev2 protocol platform proposal psk',v:'debug crypto ikev2 protocol 5 — proposal mismatch, PSK fail'},
  {t:'ASA failover configuration',p:'cisco/asa/debug',k:'failover active standby sync configure',v:'Always configure on active — changes sync automatically'},
  {t:'ASA packet capture',p:'cisco/asa/debug',k:'capture cap interface match ip host show',v:'capture CAP1 interface outside match ip host <src> host <dst>'},
  {t:'F5 pool creation',p:'f5/ltm/workflow',k:'pool f5 ltm health monitor least connections members nodes',v:'Create pool: monitor, LB method least connections, add members'},
  {t:'F5 virtual server creation',p:'f5/ltm/workflow',k:'virtual server f5 ltm destination route domain pool snat irule',v:'VS: destination IP%RD, pool, iRule *snat-<VLAN>, traffic group'},
  {t:'Traffic group Intranet Floating',p:'f5/ltm/workflow',k:'traffic group intranet floating vip failover',v:'Intranet VIPs MUST use Intranet (Floating) traffic group'},
  {t:'Route domain IP%10',p:'f5/ltm/workflow',k:'route domain ip%10 bash rdsh vsx notation',v:'IP%10 = IP in route domain 10; bash rdsh 10 to enter'},
  {t:'F5 HTTPS monitor send string',p:'f5/ltm/monitors',k:'monitor send string get post http/1.1 crlf connection close',v:'GET /path HTTP/1.1\\r\\nHost: IP\\r\\nConnection: close\\r\\n\\r\\n'},
  {t:'400 Illegal character SPACE — Jetty',p:'f5/ltm/monitors',k:'jetty 400 illegal character space double send string',v:'Double space in send string causes Jetty 400 Illegal character SPACE'},
  {t:'openssl s_client TLS test',p:'f5/ltm/monitors',k:'openssl s_client connect tls https handshake quiet servername',v:'openssl s_client -connect IP:port -quiet — test TLS manually'},
  {t:'F5 LTM logs show range',p:'f5/logs/ltm',k:'show sys log ltm range now-4d 1h 24h',v:'show /sys log ltm range now-4d — view LTM logs'},
  {t:'zcat grep compressed logs',p:'f5/logs/ltm',k:'zcat ltm gz grep log compressed archived hostname',v:'zcat ltm.2.gz ltm.3.gz | grep hostname — search archives'},
  {t:'Pool member DOWN UP events',p:'f5/logs/ltm',k:'pool member monitor status down up mcpd 01070638 01070727',v:'01070638 = DOWN; 01070727 = UP event in LTM log'},
  {t:'Certificate expiry inspection',p:'f5/logs/certs',k:'certificate tls openssl x509 inspect filestore not after expiry',v:'find /config/filestore | xargs openssl x509 — all cert validity'},
  {t:'Persistence source address',p:'f5/ltm/workflow',k:'persistence sticky source address affinity session timeout',v:'Source address affinity keeps client sticky to pool member'},
];

// ── PRE-BUILT CONTENT ─────────────────────────────────────────

function pgVPNSetup(){return'<div class="ph"><div class="pt">VPN / IPsec — Setup</div>'
+'<div class="ps">Cisco ASA &middot; IKEv2 L2L &middot; Peer IP change procedure</div>'
+'<div class="tags">'+tag('tp','Cisco')+tag('tp','ASA')+tag('tp','IPsec')+tag('tp','IKEv2')+tag('tb','L2L VPN')+'</div></div>'
+'<div class="content">'
+co('a','&#x26A0;&#xFE0F;','GOTCHA — tunnel-group keyed by peer IP','On ASA, L2L tunnel-group name IS the peer IP. Cannot rename — delete old, create new. PSKs (type 8) paste as-is from running config.')
+co('t','&#x2713;','FAILOVER — configure on active unit only','Changes on active sync to standby automatically. Never configure on standby directly.')
+'<h2>What Changes vs Stays</h2>'
+tbl(['Must Change','Leave Untouched'],[
['<code>crypto map &mdash; set peer &lt;NEW_IP&gt;</code>','ikev2 policy (global)'],
['<code>tunnel-group &lt;NEW_IP&gt;</code> recreate','ikev2 ipsec-proposal (by name)'],
['<code>no tunnel-group &lt;OLD_IP&gt;</code>','crypto map ACL (match address)'],
['<code>clear crypto ikev2 sa peer &lt;OLD_IP&gt;</code>','PFS / SA lifetime settings']])
+'<h2>1 &mdash; Pre-Change Audit</h2>'
+cb('ASA CLI','show run crypto map\nshow run tunnel-group 169.51.163.157\nshow run | i 169.51.163.157')
+'<h2>2 &mdash; Change Sequence</h2>'
+cb('ASA CLI','# 1. Update crypto map peer\ncrypto map IA_map1 11 set peer <NEW_IP>\n\n# 2. Create new tunnel-group\ntunnel-group <NEW_IP> type ipsec-l2l\ntunnel-group <NEW_IP> general-attributes\n default-group-policy GroupPolicy11\ntunnel-group <NEW_IP> ipsec-attributes\n ikev2 remote-authentication pre-shared-key 8 <key>\n ikev2 local-authentication pre-shared-key 8 <key>\n\n# 3. Remove old tunnel-group\nno tunnel-group 169.51.163.157\n\n# 4. Clear old SA\nclear crypto ikev2 sa peer 169.51.163.157')
+'<h2>3 &mdash; Verify</h2>'
+cb('ASA CLI','show crypto ikev2 sa          # Expect: UP-ACTIVE\nshow crypto ipsec sa peer <NEW_IP>  # encaps/decaps incrementing\nshow crypto ikev2 sa detail   # Status = READY')
+'</div>'}

function pgVPNDebug(){return'<div class="ph"><div class="pt">VPN / IPsec &mdash; Debug</div>'
+'<div class="ps">IKEv2 troubleshooting &middot; debug commands &middot; common failures</div>'
+'<div class="tags">'+tag('tp','Cisco')+tag('tp','IKEv2')+tag('ta','Debug')+'</div></div>'
+'<div class="content">'
+co('r','&#x26A0;&#xFE0F;','Turn off debug when done!','<code>no debug all</code> immediately after capturing output &mdash; high CPU risk on production ASA!')
+'<h2>Debug Flow</h2><div class="flow">'
+'<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">Check SA state</div>'+cb('ASA CLI','show crypto ikev2 sa          # MM_WAIT / negotiating / empty?\nshow crypto ikev2 sa detail   # full status')+'</div></div>'
+'<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">Check reachability UDP/500</div>'+cb('ASA CLI','ping <NEW_IP> source <outside-int>   # UDP 500 blocked?')+'</div></div>'
+'<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">Enable debug</div>'+cb('ASA CLI','debug crypto ikev2 protocol 5\ndebug crypto ikev2 platform 5\n# Look for: proposal mismatch, PSK fail, ID mismatch')+'</div></div>'
+'<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">Clear ghost SA</div>'+cb('ASA CLI','clear crypto ikev2 sa peer <OLD_IP>\nclear crypto ipsec sa peer <OLD_IP>')+'</div></div>'
+'</div>'
+'<h2>Common Failures</h2>'
+tbl(['Symptom','Cause','Fix'],[
['Tunnel not up after change','tunnel-group wrong/missing','show run tunnel-group — verify new IP, old gone'],
['SA never completes','proposal mismatch','check debug — DH group, encryption, hash must match peer'],
['PSK failure in debug','wrong key','re-enter pre-shared-key 8 both sides'],
['Ghost SA from old peer','stale IKEv2 SA','clear crypto ikev2 sa + clear crypto ipsec sa for old peer']])
+'</div>'}

function pgVPNTheory(){return'<div class="ph"><div class="pt">VPN / IPsec &mdash; Theory</div>'
+'<div class="ps">IKE phases &middot; IPsec modes &middot; IKEv1 vs IKEv2</div>'
+'<div class="tags">'+tag('tp','IPsec')+tag('tb','Theory')+tag('tb','IKEv2')+'</div></div>'
+'<div class="content">'
+'<h2>IKE Phase Overview</h2>'
+tbl(['Phase','IKEv1','IKEv2','Purpose'],[
['Phase 1','Main / Aggressive Mode','IKE_SA_INIT','Establish secure channel, DH, auth'],
['Phase 2','Quick Mode','CREATE_CHILD_SA','Negotiate IPsec SA (data encryption)']])
+co('t','&#x1F4A1;','IKEv2 advantage','IKEv2 uses fewer messages (4 vs 6+), built-in EAP, MOBIKE mobility. Use IKEv2 for all new deployments.')
+'<h2>IPsec Modes</h2>'
+tbl(['Mode','Encrypts','Use case'],[
['Transport','Payload only (headers intact)','Host-to-host, GRE over IPsec'],
['Tunnel','Entire packet (new headers added)','Site-to-site L2L, remote access VPN']])
+'<h2>Recommended Algorithms (modern)</h2>'
+cb('text','Encryption : AES-256-GCM (AEAD preferred), AES-256-CBC\nIntegrity  : SHA-256 / SHA-384 (not needed with GCM)\nDH group   : 14 (2048-bit), 19 (256-bit EC), 20 (384-bit EC)\nPRF        : SHA-256')
+co('a','&#x26A0;&#xFE0F;','Avoid','DES, 3DES, MD5, SHA-1, DH groups 1/2/5 &mdash; all considered weak.')
+'</div>'}

function pgASADebug(){return'<div class="ph"><div class="pt">ASA Firewall &mdash; Debug</div>'
+'<div class="ps">Show commands &middot; packet capture &middot; NAT &middot; failover</div>'
+'<div class="tags">'+tag('tp','Cisco')+tag('tp','ASA')+tag('ta','Debug')+'</div></div>'
+'<div class="content">'
+co('t','&#x2713;','Failover &mdash; active only','Always configure on active. Changes sync to standby automatically.')
+'<h2>Key Show Commands</h2>'
+cb('ASA CLI','show interface ip brief\nshow interface <name>\nshow route\nshow route <destination>\nshow xlate              # NAT translations\nshow nat detail\nshow conn count\nshow conn all\nshow failover\nshow failover state')
+'<h2>Packet Capture</h2>'
+cb('ASA CLI','capture CAP1 interface outside match ip host <src> host <dst>\nshow capture CAP1\nshow capture CAP1 detail\nclear capture CAP1\nno capture CAP1')
+'<h2>Syslog Levels</h2>'
+tbl(['Level','Name','Notes'],[
['0','Emergency','System unusable'],
['3','Error','Error conditions'],
['5','Notification','Normal but significant'],
['6','Informational','Default level'],
['7','Debugging','Verbose &mdash; enable carefully']])
+'</div>'}

// F5 pages live in js/pages-f5.js

// ── RENDERER MAP ─────────────────────────────────────────────
const RENDERERS={
  'cisco/vpn/setup':pgVPNSetup,
  'cisco/vpn/debug':pgVPNDebug,
  'cisco/vpn/theory':pgVPNTheory,
  'cisco/asa/debug':pgASADebug,
};

