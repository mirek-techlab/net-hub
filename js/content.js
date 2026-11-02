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

function pgF5LTM(){return'<div class="ph"><div class="pt">F5 LTM &mdash; Provisioning Workflow</div>'
+'<div class="ps">Nodes &rarr; Pools &rarr; Virtual Servers &rarr; Persistence &rarr; Verify</div>'
+'<div class="tags">'+tag('tg','F5')+tag('tg','LTM')+tag('ta','Route Domain')+'</div></div>'
+'<div class="content">'
+co('t','&#x1F4A1;','Pool-first','Create and verify the pool before building VS &mdash; can pre-create independently.')
+co('a','&#x26A0;&#xFE0F;','Route Domain notation','<code>10.234.8.21%10</code> = IP in route domain 10. Verify correct RD for the client subnet.')
+'<h2>Provisioning Flow</h2><div class="flow">'
+'<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">Check existing Nodes</div>'
+cb('tmsh','tmsh list /ltm node\ntmsh show /ltm node <node-name>')
+'</div></div>'
+'<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">Create Health Monitor</div>'
+cb('tmsh','ltm monitor https VL557_Customer_API {\n    destination *:9711\n    send "GET /common/v1.0/de/customer/details HTTP/1.1\\r\\nHost: 10.234.8.211\\r\\nConnection: close\\r\\n\\r\\n"\n    receive "HTTP/1.1 400"\n    interval 5\n    timeout 16\n    server-name 10.234.8.211\n}')
+'</div></div>'
+'<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">Create Pool</div>'
+tbl(['Field','Value','Notes'],[
['Name','<code>Intranet-&lt;ServiceName&gt;</code>','Match VS naming'],
['Health Monitor','Custom or gateway_icmp','HTTPS for APIs'],
['LB Method','Least Connections (member)','Default for most services'],
['Members','Real server IP:port','Add each real server']])
+cb('tmsh','ltm pool Intranet-CustomerService {\n    load-balancing-mode least-connections-member\n    monitor VL557_Customer_API\n    members {\n        10.234.2.6:9711 { address 10.234.2.6 }\n        10.234.2.7:9711 { address 10.234.2.7 }\n    }\n}')
+'</div></div>'
+'<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">Create Virtual Server</div>'
+tbl(['Field','Value','Notes'],[
['Name','<code>Intranet-&lt;ServiceName&gt;</code>','Match pool name'],
['Destination','<code>&lt;VIP&gt;%&lt;RD&gt;</code>','e.g. 10.234.8.21%10'],
['Default Pool','Pool from step 3','Required'],
['iRule','<code>*snat-&lt;VLAN-ID&gt;</code>','VLAN ID of client subnet'],
['Persistence','source_addr','Sticky sessions'],
['Traffic Group','Intranet (Floating)','REQUIRED for intranet VIPs']])
+co('r','&#x26A0;&#xFE0F;','Traffic Group','Intranet VIPs MUST use "Intranet (Floating)" traffic group. Wrong group = VIP does not float on failover!')
+'</div></div>'
+'<div class="fs"><div class="fsn">5</div><div class="fsb"><div class="fst">Verify</div>'
+cb('tmsh','tmsh show /ltm virtual Intranet-CustomerService\ntmsh show /ltm pool Intranet-CustomerService members\nshow /sys log ltm range now-1h\nbash rdsh 10   # enter route domain for testing')
+'</div></div></div>'
+'<h2>HTTP Response Codes for Monitors</h2>'
+tbl(['Code','Meaning','Monitor use'],[
['200','OK','Ideal but not required'],
['400','Bad Request (missing params)','Valid &mdash; backend alive, validation failing'],
['404','Not Found','Valid &mdash; server up, URI wrong'],
['405','Method Not Allowed','Valid &mdash; HEAD on POST-only endpoint']])
+'</div>'}

function pgF5Mon(){return'<div class="ph"><div class="pt">F5 HTTPS Monitors &mdash; Cheat Sheet</div>'
+'<div class="ps">Build, test, and troubleshoot HTTPS health monitors for Jetty API backends</div>'
+'<div class="tags">'+tag('tg','F5')+tag('tg','Monitor')+tag('tg','HTTPS')+tag('tb','Jetty')+tag('ta','SNI')+'</div></div>'
+'<div class="content">'
+'<h2>Manual Testing Flow</h2><div class="flow">'
+'<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">Test TCP</div>'+cb('bash','telnet 10.234.2.6 9701\nnc -zv 10.234.2.6 9701')+'</div></div>'
+'<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">Test TLS handshake</div>'+cb('bash','openssl s_client -connect 10.234.2.6:9701\nopenssl s_client -connect 10.234.8.21:9711 -servername 10.234.8.211')+'</div></div>'
+'<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">Send HTTP over TLS</div>'
+cb('bash','(echo -e "GET /common/v1.0/de/customer/details HTTP/1.1\\r\\nHost: 10.234.8.211\\r\\nConnection: close\\r\\n\\r\\n"; sleep 1) \\\n| openssl s_client -connect 10.234.8.21:9711 -quiet')
+co('a','&#x26A0;&#xFE0F;','No extra spaces &mdash; Jetty is strict!','GET&nbsp;&nbsp;/path (double space) &rarr; 400 Illegal character SPACE. Exactly one space.')
+'</div></div>'
+'<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">Observe response &rarr; choose receive string</div>'
+cb('HTTP response','HTTP/1.1 400 Bad Request\n{"errorMessage":"Account Number Cannot be Empty"}')
+'<p style="color:var(--text2);font-size:13px">400 = validation (missing params) &mdash; backend alive. Use <code>"HTTP/1.1 400"</code> as receive string.</p>'
+'</div></div></div>'
+'<h2>Monitor Templates</h2><h3>Customer API &mdash; port 9711</h3>'
+cb('tmsh','ltm monitor https VL557_Customer_API {\n    destination *:9711\n    send "GET /common/v1.0/de/customer/details HTTP/1.1\\r\\nHost: 10.234.8.211\\r\\nConnection: close\\r\\n\\r\\n"\n    receive "HTTP/1.1 400"\n    interval 5\n    timeout 16\n    server-name 10.234.8.211\n}')
+'<h3>Order API &mdash; port 9701</h3>'
+cb('tmsh','ltm monitor https VL557_Order_API {\n    destination *:9701\n    send "POST /common/v1.0/de/order HTTP/1.1\\r\\nHost: 10.234.8.211\\r\\nConnection: close\\r\\n\\r\\n"\n    receive "HTTP/1.1 400"\n    interval 5\n    timeout 16\n    server-name 10.234.8.211\n}')
+'<h2>Troubleshooting</h2>'
+tbl(['Symptom','Cause','Fix'],[
['400 Illegal character SPACE','Double space in send string','One space between method and URI'],
['Connection reset','Wrong port / firewall / route domain','Test TCP with telnet; check RD'],
['TLS handshake fails','Missing SNI / self-signed cert','Add server-name; test with -servername'],
['Monitor yellow','Receive string not in response','Test manually with openssl; check exact string']])
+'</div>'}

function pgF5CLI(){return'<div class="ph"><div class="pt">F5 LTM &mdash; CLI Reference</div>'
+'<div class="ps">tmsh commands &middot; bash helpers &middot; log navigation</div>'
+'<div class="tags">'+tag('tg','F5')+tag('tg','tmsh')+tag('tb','CLI')+'</div></div>'
+'<div class="content">'
+'<h2>tmsh Quick Reference</h2>'
+cb('tmsh','# Virtual servers\ntmsh list /ltm virtual\ntmsh show /ltm virtual <name>\ntmsh show /ltm virtual <name> stats\n\n# Pools & members\ntmsh list /ltm pool\ntmsh show /ltm pool <name> members\n\n# Nodes\ntmsh show /ltm node\n\n# Monitors\ntmsh list /ltm monitor https\n\n# iRules & SNAT\ntmsh list /ltm rule\ntmsh list /ltm snat\n\n# Persistence table\ntmsh show /ltm persistence persist-records\n\n# Save config\ntmsh save /sys config')
+'<h2>bash Helpers</h2>'
+cb('bash','bash rdsh 10            # enter route domain 10\ntail -f /var/log/ltm    # live log\ngrep <pattern> /var/log/ltm\nzcat ltm.2.gz ltm.3.gz ltm.4.gz | grep <pattern>')
+'</div>'}

function pgF5Logs(){return'<div class="ph"><div class="pt">F5 &mdash; LTM Log Analysis</div>'
+'<div class="ps">Monitor events &middot; log commands &middot; compressed log search</div>'
+'<div class="tags">'+tag('tg','F5')+tag('ta','Logs')+tag('ta','Debug')+'</div></div>'
+'<div class="content">'
+'<h2>Log Commands</h2>'
+cb('tmsh','show /sys log ltm range now-4d\nshow /sys log ltm range now-1h\nshow /sys log ltm range now-24h')
+cb('bash','grep <hostname> /var/log/ltm\ntail -f /var/log/ltm | grep <pattern>\nzcat ltm.2.gz ltm.3.gz ltm.4.gz ltm.5.gz | grep dehensvm02')
+'<h2>Monitor Event Examples</h2>'
+cb('log output','# DOWN event (01070638)\nDec 12 00:44:14 ic8v-f5lb notice mcpd[5266]: 01070638:5:\nPool /Common/Intranet-VERTEX-PROD_80\nmember /Common/Intranet-dehensvm024:8099 monitor status down.\n[ last error: Response Code: 200 ]\n[ was up for 266hrs:45mins:44sec ]\n\n# UP event (01070727)\nDec 12 00:47:48 ic8v-f5lb notice mcpd[5266]: 01070727:5:\nPool /Common/Intranet-VERTEX-PROD_80\nmember /Common/Intranet-dehensvm024:8099 monitor status up.\n[ was down for 0hr:3mins:34sec ]')
+tbl(['Event ID','Event','Action'],[
['01070638','Member DOWN','Check last error; inspect backend'],
['01070727','Member UP','Recovered; watch for flapping'],
['200 in DOWN event','Receive string not matching','Test manually with openssl; check receive string']])
+co('a','&#x26A0;&#xFE0F;','200 response in a DOWN event?','Monitor gets 200 but member is DOWN = receive string not in response body. Test with openssl s_client to see actual response.')
+'<h2>Log Locations</h2>'
+tbl(['File','Content'],[
['/var/log/ltm','Current &mdash; live'],
['/var/log/ltm.1 .. ltm.7','Rotated plain text'],
['/var/log/ltm.1.gz .. ltm.7.gz','Compressed &mdash; use zcat'],
['/var/log/audit','Config change log']])
+'</div>'}

function pgF5Certs(){return'<div class="ph"><div class="pt">F5 &mdash; Certificate Inspection</div>'
+'<div class="ps">TLS cert management &middot; expiry checks &middot; ClientSSL profiles</div>'
+'<div class="tags">'+tag('tg','F5')+tag('tb','TLS')+tag('tb','Certificates')+'</div></div>'
+'<div class="content">'
+'<h2>Inspect All Certs in Filestore</h2>'
+cb('bash','find /config/filestore/files_d/*_d/certificate_d -name "*_*" \\\n  | egrep -v \'bundle|default|irule\' \\\n  | xargs -i openssl x509 -in {} -text -noout -inform pem 2>&- \\\n  | awk \'/Issuer:/,/Not After :/ {print $0}\'')
+cb('text','Issuer: CN=DigiCert Global G2 TLS RSA SHA256 2020 CA1\nValidity\n    Not Before: May  9 00:00:00 2024 GMT\n    Not After : May 13 23:59:59 2025 GMT   <-- EXPIRED!\n\nIssuer: CN=Kyndryl Certificate Authority DC1-T1\nValidity\n    Not Before: Oct 15 00:00:00 2025 GMT\n    Not After : Oct 14 23:59:59 2026 GMT   <-- OK')
+co('a','&#x26A0;&#xFE0F;','Check expiry proactively','An expired cert causes immediate TLS failures for all users of that VS &mdash; no advance warning.')
+'<h2>List ClientSSL Profiles per VS</h2>'
+cb('bash','tmsh show /ltm virtual profiles | egrep \'Ltm::Virtual Server:|Ltm::ClientSSL Profile:\'')
+'<h2>Cert Management</h2>'
+cb('tmsh','tmsh list /sys crypto cert\ntmsh list /sys crypto key\ntmsh install /sys crypto cert <name> from-local-file <path>\ntmsh modify /ltm profile client-ssl <profile> cert <cert> key <key>')
+'</div>'}

// ── RENDERER MAP ─────────────────────────────────────────────
const RENDERERS={
  'cisco/vpn/setup':pgVPNSetup,
  'cisco/vpn/debug':pgVPNDebug,
  'cisco/vpn/theory':pgVPNTheory,
  'cisco/asa/debug':pgASADebug,
  'f5/ltm/workflow':pgF5LTM,
  'f5/ltm/monitors':pgF5Mon,
  'f5/ltm/cli':pgF5CLI,
  'f5/logs/ltm':pgF5Logs,
  'f5/logs/certs':pgF5Certs,
};

