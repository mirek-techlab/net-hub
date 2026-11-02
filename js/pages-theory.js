// pages-theory.js — general reference / refresher pages (General / RFCs).

// ═══════════════════════════════════════════════════════════════════
// TLS certificates — basics for a load-balancer engineer
// ═══════════════════════════════════════════════════════════════════
function pgTLSBasics() {
  return '<div class="ph"><div class="pt">TLS certificates &mdash; the basics</div>'
    + '<div class="ps">Key, CSR, CA, chain, SAN &mdash; what they are, how a certificate gets renewed, and where each piece lives on an F5</div>'
    + '<div class="tags">' + tag('tgr', 'Theory') + tag('tb', 'TLS') + tag('tb', 'PKI') + tag('tg', 'F5') + tag('ta', 'openssl') + '</div></div>'
    + '<div class="content">'

    + '<h2>The pieces</h2>'
    + tbl(['Piece', 'What it is', 'Secret?'], [
      ['<strong>Private key</strong>', 'the server\'s secret. Proves the server owns the certificate. Never leaves the device it was generated on (ideally).', '<strong>yes</strong>'],
      ['<strong>CSR</strong> (Certificate Signing Request)', 'public key + the names you want (CN, SAN), signed with the private key. You send it to the CA.', 'no'],
      ['<strong>CA</strong> (Certificate Authority)', 'who signs: public CA (DigiCert, GlobalSign, Let\'s Encrypt) or a company\'s <strong>internal CA</strong> (only trusted inside that company).', '&mdash;'],
      ['<strong>Certificate</strong>', 'the CA\'s signed answer to the CSR: public key + names + validity + issuer. Useless without the matching key.', 'no'],
      ['<strong>Intermediate / chain</strong>', 'CAs sign through intermediates: <em>root &rarr; intermediate &rarr; server cert</em>. The server must send the intermediate(s) too.', 'no'],
      ['<strong>Root CA</strong>', 'trusted by the client (browser / OS / Java store). Never sent by the server.', 'no'],
    ])
    + cb('trust chain', `Root CA            (in the client's trust store)
  └─ Intermediate CA   (sent by the server as "chain")
       └─ Server certificate  CN=app.example.com, SAN=app.example.com, app
            + private key on the server / F5`)

    + '<h2>Names: CN vs SAN</h2>'
    + '<ul style="margin:0 0 10px 22px">'
    + '<li><strong>CN</strong> (Common Name) &mdash; the old field for the server name. <strong>Browsers ignore it today.</strong></li>'
    + '<li><strong>SAN</strong> (Subject Alternative Name) &mdash; the list of names the cert is valid for. <strong>Every name clients use must be here</strong>, including the one in the CN.</li>'
    + '<li>Wildcard <code>*.example.com</code> covers <code>app.example.com</code>, not <code>example.com</code> and not <code>a.b.example.com</code>.</li>'
    + '<li>A short name (<code>app</code>) or an IP works only if it is in the SAN (IP as <code>IP:10.0.0.1</code>) &mdash; and public CAs will not sign those.</li>'
    + '</ul>'

    + '<h2>Renewal / new certificate &mdash; the workflow</h2><div class="flow">'
    + '<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">Find what is in use today</div>'
    + cb('bash', `echo | openssl s_client -connect app.example.com:443 -servername app.example.com 2>/dev/null \\
  | openssl x509 -noout -subject -issuer -enddate -ext subjectAltName`)
    + '<p>Note the issuer (which CA), the names (SAN) and the expiry.</p>'
    + co('a', '&#x26A0;&#xFE0F;', 'Older openssl (e.g. on older BIG-IP versions)', '<code>-ext</code> and <code>-addext</code> need OpenSSL 1.1.1+. On 1.0.x use <code>openssl x509 -noout -text | grep -A1 "Subject Alternative"</code> instead &mdash; or generate the CSR with tmsh.')
    + '</div></div>'
    + '<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">Generate a new key + CSR (on the F5 or with openssl)</div>'
    + cb('F5 tmsh', `create sys crypto key app.example.com_2026 key-size 4096 gen-csr common-name app.example.com \\
    subject-alternative-name "DNS:app.example.com, DNS:app"
list sys crypto csr app.example.com_2026`)
    + cb('openssl', `openssl req -new -newkey rsa:4096 -nodes -keyout app_2026.key -out app_2026.csr \\
    -subj "/CN=app.example.com" -addext "subjectAltName=DNS:app.example.com,DNS:app"
openssl req -in app_2026.csr -noout -text | grep -A1 "Subject Alternative"   # check before sending`)
    + '</div></div>'
    + '<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">CA signs it</div><p>Send the CSR (text block starting with <code>-----BEGIN CERTIFICATE REQUEST-----</code>). Public CA &rarr; their portal; internal CA &rarr; the customer\'s PKI team. You get back the certificate and usually the intermediate(s).</p></div></div>'
    + '<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">Check what you received</div>'
    + cb('openssl', `openssl x509 -in app_2026.crt -noout -subject -issuer -dates -ext subjectAltName
# does the cert belong to the key? (both hashes must be identical)
openssl x509 -in app_2026.crt -noout -pubkey | openssl sha256
openssl pkey -in app_2026.key -pubout | openssl sha256`)
    + '</div></div>'
    + '<div class="fs"><div class="fsn">5</div><div class="fsb"><div class="fst">Install as a NEW object and attach it</div>'
    + cb('F5 tmsh', `install sys crypto cert app.example.com_2026 from-local-file /var/tmp/app_2026.crt
install sys crypto cert intermediate_2026 from-local-file /var/tmp/intermediate.crt
modify ltm profile client-ssl app_client-ssl cert-key-chain replace-all-with { \\
    app_0 { cert app.example.com_2026 key app.example.com_2026 chain intermediate_2026 } }
save sys config`)
    + '<p>Keep the old cert/key object until the new one is confirmed &mdash; that is your backout.</p></div></div>'
    + '<div class="fs"><div class="fsn">6</div><div class="fsb"><div class="fst">Verify from outside</div>'
    + cb('bash', `echo | openssl s_client -connect <VIP>:443 -servername app.example.com -showcerts 2>/dev/null | grep -E "s:|i:"
# s: = subject, i: = issuer per certificate in the chain → server cert + intermediate expected`)
    + '</div></div></div>'

    + '<h2>Where things live on an F5</h2>'
    + tbl(['Object', 'Meaning'], [
      ['<code>sys crypto key / cert / csr</code>', 'the stored key, certificate, CSR (per partition)'],
      ['<strong>client-ssl</strong> profile', 'TLS between the <strong>client and the F5</strong> (the VIP). Holds your cert + key + chain. This is what browsers see.'],
      ['<strong>server-ssl</strong> profile', 'TLS between the <strong>F5 and the pool members</strong> (re-encryption). The F5 is the client here; usually no cert of yours needed.'],
      ['<code>cert-key-chain</code>', 'inside client-ssl: which cert + key + chain to present (several entries possible, e.g. RSA + ECDSA)'],
      ['One profile, many VS', 'changing the cert in a shared client-ssl profile changes it for <strong>every VS using that profile</strong>'],
    ])
    + cb('F5', `tmsh run sys crypto check-cert                                  # expired / expiring
tmsh show /ltm virtual profiles | egrep 'Ltm::Virtual Server:|Ltm::ClientSSL Profile:'   # who uses what`)

    + '<h2>File formats</h2>'
    + tbl(['Format', 'Looks like', 'Convert'], [
      ['PEM (<code>.crt .pem .key .cer</code>)', 'text, <code>-----BEGIN …-----</code>', 'what F5 and most Linux tools want'],
      ['DER (<code>.der .cer</code>)', 'binary', '<code>openssl x509 -inform der -in a.der -out a.pem</code>'],
      ['PKCS#12 (<code>.pfx .p12</code>)', 'binary, cert + key (+ chain), password-protected', '<code>openssl pkcs12 -in a.pfx -nodes -out a.pem</code>'],
      ['PKCS#7 (<code>.p7b</code>)', 'certificates only (often the chain)', '<code>openssl pkcs7 -print_certs -in a.p7b -out chain.pem</code>'],
    ])

    + '<h2>Common errors</h2>'
    + tbl(['Symptom', 'Cause'], [
      ['Browser: name mismatch (<code>NET::ERR_CERT_COMMON_NAME_INVALID</code>)', 'the hostname is not in the SAN list'],
      ['<code>unable to get local issuer certificate</code> / works in browser, fails in Java/curl', 'intermediate missing on the server &mdash; add the chain'],
      ['<code>self-signed certificate in certificate chain</code>', 'internal CA not trusted by the client &mdash; expected for internal CAs on non-company clients'],
      ['<code>certificate has expired</code>', 'renew; check <code>-enddate</code> of server cert <em>and</em> intermediate'],
      ['F5: "key and certificate do not match"', 'cert was signed for a different CSR/key &mdash; compare public key hashes (step 4)'],
    ])
    + co('t', '&#x1F4A1;', 'Related', 'F5 commands: <a href="#f5/logs/certs">F5 &rsaquo; Certificates</a>. Real case with an internal CA and SANs: <a href="#f5/ltm/case-preview-vip">Case: new HTTPS VIP + SAN cert</a>.')
    + '</div>';
}

Object.assign(RENDERERS, { 'theory/security/tls': pgTLSBasics });

IDX.push(
  { t: 'TLS certificate basics (key, CSR, CA, chain, SAN)', p: 'theory/security/tls', k: 'tls ssl certificate csr private key ca intermediate chain root san cn pki basics', v: 'What each piece is and how a renewal works' },
  { t: 'Check cert matches key (openssl)', p: 'theory/security/tls', k: 'openssl x509 pkey pubkey sha256 match key certificate', v: 'compare public key hashes' },
  { t: 'Convert pfx / p7b / der to pem', p: 'theory/security/tls', k: 'pkcs12 pfx p12 p7b pkcs7 der pem convert openssl', v: 'openssl pkcs12 -in a.pfx -nodes -out a.pem' },
  { t: 'unable to get local issuer certificate', p: 'theory/security/tls', k: 'unable to get local issuer intermediate chain missing curl java', v: 'Intermediate missing on the server' },
);

// ═══════════════════════════════════════════════════════════════════
// IKE behind NAT, aggressive mode, reading "Failed SA" logs
// ═══════════════════════════════════════════════════════════════════
(function () {
  const sub = TREE.find(t => t.id === 'theory').subs.find(s => s.id === 'security');
  if (!sub.pages.some(p => p.id === 'ike-nat')) sub.pages.push({ id: 'ike-nat', label: 'IKE: NAT & aggressive mode' });
})();

function pgIKENat() {
  return '<div class="ph"><div class="pt">IKE &mdash; NAT, aggressive mode &amp; "unknown" peer IPs</div>'
    + '<div class="ps">Why the peer IP in a VPN log is not in your config, how aggressive mode picks the key, and how to troubleshoot "phase 1 failed &hellip; timeout"</div>'
    + '<div class="tags">' + tag('tgr', 'Theory') + tag('tb', 'IPsec') + tag('tb', 'IKEv1') + tag('ta', 'NAT-T') + tag('tr', 'Troubleshooting') + '</div></div>'
    + '<div class="content">'

    + '<h2>The log that looks wrong</h2>'
    + cb('remote side log', `IKE phase-1 negotiation is failed as initiator, aggressive mode.
Failed SA: 172.16.100.50[500]-203.0.113.90[500] cookie:7873619f9dfe551c:0000000000000000. Due to timeout.`)
    + tbl(['Part', 'What it tells you'], [
      ['<code>as initiator</code>', 'the device that <strong>wrote</strong> this log started the negotiation &mdash; it is the remote side\'s log, not yours'],
      ['<code>172.16.100.50[500]</code>', 'its <strong>own local address</strong> &mdash; private, behind NAT. You will never see it in your config; you see its public (NAT) address'],
      ['<code>203.0.113.90[500]</code>', 'the peer it tries to reach = <strong>your</strong> VPN gateway'],
      ['<code>[500]</code> on both', 'first IKE packet always uses UDP 500; NAT-T switches to 4500 only after NAT is detected (later messages)'],
      ['cookie <code>…:0000000000000000</code>', 'the responder cookie is <strong>zero</strong> &rarr; no answer was ever received from your side'],
      ['<code>Due to timeout</code>', 'retransmissions ran out, no reply'],
    ])
    + co('t', '&#x1F50E;', 'So the question is', 'Do their packets reach your gateway at all, and if yes, why does your gateway not answer? Ask them for their <strong>public NAT IP</strong> and the <strong>IKE ID</strong> they send.')

    + '<h2>Main vs aggressive mode (IKEv1)</h2>'
    + tbl(['', 'Main mode', 'Aggressive mode'], [
      ['Messages', '6', '3'],
      ['Identity', 'encrypted', '<strong>sent in clear</strong> in the first packet'],
      ['PSK selected by', 'peer <strong>IP address</strong>', 'peer <strong>IKE ID</strong> (FQDN, user-FQDN, key-id, or IP)'],
      ['Typical use', 'static peers', 'peer with a dynamic / NATed address, remote access'],
      ['Security', 'better', 'ID exposed; PSK hash can be attacked offline &mdash; avoid where possible, prefer IKEv2'],
    ])
    + '<p>Because the responder does not know the peer\'s IP in advance, it must find the config by the <strong>ID</strong> in the first packet. If the remote sends an IP-type ID, that is often its <strong>private</strong> address (here 172.16.100.50) &mdash; which will not match a config built for its public IP.</p>'

    + '<h2>Why it fails &mdash; usual causes</h2>'
    + tbl(['Cause', 'How you see it'], [
      ['UDP 500/4500 blocked or not routed to your gateway', 'nothing in your capture from their public IP'],
      ['aggressive mode disabled on your side', 'packets arrive, no reply / "aggressive mode not allowed" in debug'],
      ['no matching peer/ID config (ID is FQDN or private IP, you match on public IP)', 'debug: no tunnel-group / profile / keyring found for the ID'],
      ['PSK mismatch', 'reply is sent, then a hash/auth failure (not a timeout on their side)'],
      ['their public IP changes (dynamic ISP, NAT pool)', 'intermittent: works, then times out after the IP changes'],
      ['proposal mismatch', 'reply with NO_PROPOSAL_CHOSEN, not a timeout'],
    ])

    + '<h2>Troubleshoot on your gateway</h2>'
    + cb('Cisco ASA', `capture IKE type isakmp match udp host <their-public-ip> host <your-peer-ip>
show capture IKE
debug crypto condition peer <their-public-ip>
debug crypto ikev1 127
show crypto ikev1 sa
show run crypto ikev1 | include am-disable        # "crypto ikev1 am-disable" = aggressive mode off`)
    + cb('Cisco IOS / IOS XE', `debug crypto condition peer ipv4 <their-public-ip>
debug crypto isakmp
show crypto isakmp sa
show run | include aggressive-mode                 # "crypto isakmp aggressive-mode disable"`)
    + cb('FortiGate', `diagnose sniffer packet any "host <their-public-ip> and (udp port 500 or udp port 4500)" 4
diagnose vpn ike log filter rem-addr4 <their-public-ip>    # older: diagnose vpn ike log-filter dst-addr4 …
diagnose debug application ike -1
diagnose debug enable
# phase1-interface for such a peer: set type dynamic / set mode aggressive / set peertype one / set peerid "<their ID>"`)
    + co('a', '&#x26A0;&#xFE0F;', 'Filter on the public IP', 'Their private address (172.16.x) never reaches you. Capture and debug on the <strong>public</strong> NAT address &mdash; or capture everything on UDP 500/4500 for a minute if you do not know it yet.')
    + '<h2>Case: the remote side "migrated" to IKEv2 &mdash; and back</h2>'
    + '<p style="color:var(--text2)">Real incident, anonymised. The partner changed their side without telling us; the tunnel became intermittent and their logs showed the message above.</p>'
    + '<div class="flow">'
    + '<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">What they did</div><p>Switched their gateway to IKEv2 on their own, turned on aggressive mode, changed identity settings &mdash; and defined the traffic selectors <strong>per host (/32)</strong>, while our side protects whole networks (/16 and similar). When it did not come up, they switched back to IKEv1 &mdash; but kept much of the IKEv2 configuration (proposals, identity type, timers). The result was a mix that neither matched the old agreement nor a clean IKEv2 setup.</p>'
    + co('r', '&#x1F3AF;', 'Root cause: three things on the partner side at once', '<strong>1)</strong> IKE gateway left on <strong>"auto"</strong> after an unfinished IKEv2 attempt &mdash; it initiated IKEv1 <strong>Aggressive Mode</strong> (their own log); our gateway drops Aggressive Mode. <strong>2)</strong> <strong>Traffic selectors</strong> did not mirror ours (host /32 entries vs our subnets) &rarr; traffic put into the wrong SA. <strong>3)</strong> <strong>DPD every 5 s</strong> &rarr; dead-peer declared on short hiccups &rarr; tunnel torn down and rebuilt. Nothing was wrong or changed on our side.')
    + '</div></div>'
    + '<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">What it looked like</div>'
    + tbl(['Symptom', 'Explanation'], [
      ['phase 1 timeout as initiator, responder cookie 0', 'our side did not accept their packets (version / mode / ID did not match any config) &rarr; no reply'],
      ['their private IP in the log', 'IP-type identity sent from behind NAT'],
      ['intermittent', 'a repeating cycle &mdash; see below'],
      ['drops around <strong>09:00</strong> and again before <strong>17:00</strong>, a few minutes each, fine the rest of the day', 'typical for a timer (SA lifetime / rekey) or for tunnels re-created when traffic starts after an idle period &mdash; not for a config change (a change breaks it permanently)'],
      ['several countries / sites "down" in their monitoring at once', 'all behind the same tunnel; part of the red was unrelated ports &mdash; separate monitoring noise from real impact'],
      ['partner: "you must have changed something"', 'nobody had &mdash; proven with the session data below'],
      ['no useful network documentation', 'their IP mapping list did not show the NAT or the change'],
    ])
    + '<h3>The cycle that made it "intermittent"</h3>'
    + cb('sequence', `1. partner tries IKEv2 (host /32 selectors)          -> does not come up
2. partner falls back to IKEv1 AGGRESSIVE mode        -> our ASA drops it immediately (aggressive mode disabled)
                                                         = their log: "failed as initiator, aggressive mode … cookie …:0000 … timeout"
3. IKEv1 eventually negotiates                         -> tunnel UP, traffic works for a while
4. DPD (5 s) declares the peer dead on a short hiccup  -> SAs deleted, "Lost Service"
   or traffic hits the wrong (host /32) SA              -> dropped (%ASA-4-402116)
   rebuild: partner tries AGGRESSIVE mode (dropped),    -> minutes of outage until IKEv1 Main Mode
   our ASA tries IKEv2 first (unanswered)                  finally succeeds
5. back to step 1`)
    + co('p', '&#x2139;&#xFE0F;', 'Lifetimes were not the trigger', 'Both sides had phase 1 = 24 h and phase 2 = 8 h. The drops matched <strong>DPD loss</strong> timestamps in the ASA log instead (see the log timeline below). Always check the timers against real log times before blaming them.')
    + '<p>Every "it works again" was just step 3 &mdash; nothing had been fixed. The pattern only becomes visible when you line up <strong>tunnel up/down times</strong> with <strong>rekey lifetimes</strong> and the partner\'s change attempts.</p>'
    + '</div></div>'
    + '<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">How to recognise version / mode mismatch in debug</div>'
    + tbl(['Seen', 'Meaning'], [
      ['IKEv2 packet on an IKEv1-only peer (or v1 on v2-only)', 'ignored or answered with an error such as <code>INVALID_MAJOR_VERSION</code>; often looks like a plain timeout on the other side'],
      ['aggressive mode packet, aggressive mode disabled / not configured', 'dropped, no reply'],
      ['ID payload with an unexpected type/value', 'no matching tunnel-group / profile / phase1 &rarr; dropped or auth failure'],
      ['works only when one side initiates', 'parameters differ per direction &mdash; compare both configs line by line'],
    ])
    + '</div></div>'
    + '<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">Proving it is not your side (took days of discussion)</div>'
    + tbl(['Evidence', 'How to get it'], [
      ['your config did not change', 'config change log / commit history / archive diff for the tunnel since the last working day'],
      ['their packets arrive and are different from the agreement', 'capture on your gateway from their public IP: IKE version, exchange type (aggressive / main / IKE_SA_INIT), ID payload'],
      ['why your side does not answer', 'IKE debug on your gateway filtered on their public IP: "no matching peer / ID", "aggressive mode not allowed", version error'],
      ['it works when the agreed parameters are used', 'a successful SA from the same peer when your side initiates (or from the time before their change)'],
      ['timeline', 'first failure time vs. their change window &mdash; ask them for their change log'],
    ])
    + '<h3>The ASA log of one outage</h3>'
    + cb('ASA syslog (UTC)', `11:00:42  %ASA-5-713120: Group = 203.0.113.104, PHASE 2 COMPLETED
11:01:41  %ASA-4-750003: Local:203.0.113.90:500 Remote:203.0.113.104:500
          IKEv2 Negotiation aborted due to ERROR: Maximum number of retransmissions reached   <- OUR ASA trying IKEv2 first (see capture)
11:03:38  %ASA-6-302016: Teardown UDP connection … 203.0.113.104/500 to 203.0.113.90/500
12:58:56  %ASA-3-713123: Group = 203.0.113.104, IKE lost contact with remote peer,
          deleting connection (keepalive type: DPD)                                         <- DPD loss
12:58:57  %ASA-6-602304: IPSEC: An outbound LAN-to-LAN SA (SPI= 0x…) … has been deleted.
12:58:57  %ASA-6-602304: IPSEC: An inbound LAN-to-LAN SA (SPI= 0x…) … has been deleted.
12:58:57  %ASA-5-713259: Session is being torn down. Reason: Lost Service
12:59:32  %ASA-6-713172: Automatic NAT Detection Status: Remote end IS behind a NAT device
12:59:32  %ASA-6-713905: Floating NAT-T to port 4500                                         <- rebuilt 35 s later`)
    + tbl(['Message', 'Meaning'], [
      ['<code>713123 … lost contact … (keepalive type: DPD)</code>', 'our side sent DPD and got no answer &rarr; declares the peer dead and deletes everything'],
      ['<code>602304 … SA has been deleted</code>, <code>713259 … Lost Service</code>', 'consequence of the DPD loss; the partner only sees "SA delete received from peer" and restarts'],
      ['<code>750003 … IKEv2 … maximum number of retransmissions</code>', 'IKEv2 attempt got no answer. The capture showed these <code>IKE_SA_INIT</code> packets were sent by <strong>our</strong> ASA: with both IKEv1 and IKEv2 enabled for the peer, the ASA as initiator tries IKEv2 first and falls back to IKEv1'],
      ['<code>750001 … Received request to establish an IPsec tunnel; local/remote traffic selector = single address</code>', 'logged when traffic triggers tunnel setup &mdash; the /32 ranges are most likely the <strong>triggering packets</strong>, not a peer proposal. Do not read them as the partner\'s selectors without a capture'],
      ['<code>113019 Session disconnected … Duration 4h:04m … Reason: Lost Service</code>', 'session summary: how long it lived and why it ended'],
      ['later <code>Reason: Peer Terminate</code> / <code>User Requested</code>', 'the <strong>peer</strong> requested the deletion &mdash; not a DPD decision of our side'],
      ['<code>713172</code> / <code>713905</code>', 'new IKE SA: NAT detected on their side, NAT-T on UDP 4500 &mdash; tunnel back'],
    ])
    + '<h3>The partner\'s log of the same outage (Palo Alto system log)</h3>'
    + cb('Palo Alto system log (UTC, newest last)', `06:58:12 … 06:58:42  ike-recv-notify     IKE notification received: INVALID-SPI (11)          (every 6 s)
08:59:55  ike-recv-p2-delete  IPsec SA delete message received from peer. SPI:0x…    (x10)
08:59:55  ike-recv-p1-delete  phase-1 SA delete message received from peer
08:59:55  ike-nego-p1-start   phase-1 negotiation started as INITIATOR, AGGRESSIVE mode.
                              172.16.100.50[500]-203.0.113.90[500] cookie:…:0000000000000000
08:59:56  ike-nego-p1-start   phase-1 negotiation started as RESPONDER, MAIN mode
08:59:56  ike-nego-p1-expire  phase-1 SA is expired (old SA)
09:00:20  ike-nego-p1-succ    phase-1 negotiation succeeded as RESPONDER, MAIN mode.
                              172.16.100.50[4500]-203.0.113.90[4500] … lifetime 86400 Sec.
09:00:27  ike-nego-p1-fail    phase-1 negotiation failed as INITIATOR, AGGRESSIVE mode … Due to timeout.`)
    + tbl(['Lines', 'What it proves'], [
      ['<code>INVALID-SPI</code> notifications two hours earlier', 'our ASA kept receiving ESP with SPIs it no longer had &rarr; the partner was still sending into an SA that our side had deleted &mdash; SA state out of sync long before the outage. On the ASA look for messages about ESP with an invalid/unknown SPI at the same times.'],
      ['SA deletes received at 08:59:55', 'the ASA DPD teardown (08:59:56 in the ASA log) &mdash; both logs match within a second'],
      ['p1 start as <strong>initiator, aggressive mode</strong> right after the delete', 'the "auto" gateway does initiate in Aggressive Mode &mdash; contrary to the partner\'s statement'],
      ['p1 start as responder, main mode one second later', 'our ASA initiates in parallel &mdash; both sides race'],
      ['succeeded as <strong>responder</strong>, main mode, port 4500', 'the tunnel came back because <strong>our</strong> ASA initiated it (NAT-T) &mdash; ~25 s'],
      ['failed as initiator, aggressive mode, timeout', 'their own attempt never works: our side drops Aggressive Mode'],
    ])
    + co('t', '&#x1F4A1;', 'Ask for the partner\'s system log early', 'One screenshot of their IKE system log around the outage answered more than days of discussion: their mode, who rebuilt the tunnel, and that SAs were out of sync before. Ask for it in the first request.')
    + '<h3>Reading the IKE capture (Wireshark)</h3>'
    + cb('capture (simplified)', `13:14:10  OUR-ASA -> PEER  IKE_SA_INIT MID=00 Initiator Request     <- IKEv2, no answer
13:14:10  OUR-ASA -> PEER  Identity Protection (Main Mode)          <- IKEv1 Main Mode
13:14:16  PEER -> OUR-ASA  Identity Protection (Main Mode)          <- peer answers v1
13:14:16  …               Identity Protection (Main Mode) x6       <- v1 phase 1 done
13:14:23  OUR-ASA -> PEER  IKE_SA_INIT MID=00 Initiator Request     <- v2 retries keep going,
13:14:38  OUR-ASA -> PEER  IKE_SA_INIT …                               never answered
13:15:07  OUR-ASA -> PEER  IKE_SA_INIT …`)
    + tbl(['Wireshark "Info"', 'Protocol'], [
      ['<code>IKE_SA_INIT</code>, <code>IKE_AUTH</code>, <code>CREATE_CHILD_SA</code>, <code>INFORMATIONAL</code>', 'IKEv2'],
      ['<code>Identity Protection (Main Mode)</code>', 'IKEv1 phase 1, main mode'],
      ['<code>Aggressive</code>', 'IKEv1 phase 1, aggressive mode'],
      ['<code>Quick Mode</code>', 'IKEv1 phase 2'],
    ])
    + co('p', '&#x1F4A1;', 'Check who sends what', 'Look at the <strong>source</strong> column before concluding who is "trying IKEv2". Here it was our own ASA. If the partner does not run IKEv2 yet, an IKEv2 entry in your crypto map only adds unanswered retries to every re-establishment: <code>show run crypto map | include &lt;seq&gt;|ikev2</code>.')
    + '<h3>Traffic in the wrong SA: %ASA-4-402116</h3>'
    + cb('ASA syslog', `%ASA-4-402116: IPSEC: Received an ESP packet (SPI= 0xC06BBCE9) from 203.0.113.104 to 203.0.113.90.
The decapsulated inner packet doesn't match the negotiated policy in the SA.
The packet specifies its destination as 10.200.65.2, its source as 10.30.154.64, and its protocol as udp.
The SA specifies its local proxy as 198.51.100.151/255.255.255.255/ip/0
and its remote proxy as 10.200.66.6/255.255.255.255/ip/0.`)
    + '<p>The partner encrypted a packet between two <strong>subnets</strong> (10.30.x &harr; 10.200.65.x) into the <strong>host-to-host</strong> SA. The ASA checks every decrypted packet against the SA proxies and drops it. This message is proof of a <strong>selector mismatch on the sending side</strong>. Our selectors for reference: local 198.51.100.144/28 + 10.30.0.0/16, remote 10.200.64.0/22.</p>'
    + '<h3>What to request from the partner (Palo Alto)</h3>'
    + cb('request', `Please check the logs around the exact DPD loss timestamps (UTC):
  - <date> 08:59:56Z
  - <date> 12:58:47Z
We need to know whether the gateway received DPD/IKE packets from our peer and whether it replied.
Please provide:
  - ikemgr.log around those timestamps
  - IKE / IPsec SA lifetime values
  - DPD settings
  - tunnel monitor settings
  - NAT-T settings
  - IKE gateway version / exchange mode
  - whether any IKEv2 rekey/migration attempt happens at those times
  - whether the IKE daemon, dataplane or HA/path monitoring had any event at those times
  - routing / policy-based forwarding for the VPN traffic and the proxy-IDs (traffic selectors)`)
    + '<h3>Where is the problem? Capture on both ends at the same time</h3>'
    + tbl(['Partner\'s capture during the outage shows', 'Problem is in'], [
      ['our UDP/4500 IKE/DPD packets arrive, <strong>no reply</strong> leaves', 'partner\'s IKE processing (daemon, config, CPU)'],
      ['reply leaves, but our ASA never receives it', 'return path: NAT, upstream firewall, ISP'],
      ['our packets <strong>never arrive</strong>', 'forward path between the two gateways'],
    ])
    + '<p>On Palo Alto: packet capture with receive / transmit / drop stages filtered on both peer addresses and UDP 500/4500, plus <code>ikemgr.log</code> with IKE debug and the IKE pcap, for at least 60 s around the expected outage.</p>'
    + co('a', '&#x26A0;&#xFE0F;', 'Trust the logs, not the description', 'The partner\'s answer was "IKE mode auto &mdash; accepts both, but initiates in main" while their own log said <em>aggressive mode</em> as initiator. When a statement contradicts a log line, ask for the log, not for another statement.')
    + '<h3>The commands that settled it (ASA)</h3>'
    + cb('Cisco ASA', `capture VA match ip any host 10.30.68.5          # during the outage: "Capturing - 0 bytes" = no traffic in the tunnel
show capture VA

show vpn-sessiondb l2l filter ipaddress 203.0.113.104
  Protocol     : IKEv1 IPsecOverNatT
  Encryption   : IKEv1: (1)AES128  IPsecOverNatT: (10)AES128
  Hashing      : IKEv1: (1)SHA1    IPsecOverNatT: (10)SHA1
  Login Time   : 12:59:32 UTC        <- tunnel was (re)built right at the reported outage
  Duration     : 0h:15m:51s
show clock                                         # compare with Login Time

show crypto ipsec sa peer 203.0.113.104 | include ident|pkts|settings
  local ident  (10.30.0.0/255.255.0.0)   remote ident (10.200.64.0/255.255.252.0)
  #pkts encaps: 142271  #pkts decaps: 82780        <- both directions counting
  in use settings ={L2L, Tunnel, NAT-T-Encaps, PFS Group 5, IKEv1, }`)
    + co('t', '&#x1F50E;', 'Login Time is the key evidence', '<code>Login Time</code> / <code>Duration</code> in <code>show vpn-sessiondb</code> tell you exactly when the tunnel was last (re)established. If that matches the outage and your change log is empty, the tunnel went down and was rebuilt &mdash; without anyone touching your side.')
    + co('a', '&#x26A0;&#xFE0F;', 'Many SAs, easy to misread', 'With ten local subnets there are ten SA blocks per peer. Filter on one ident before reading "in use settings" &mdash; it is easy to look at the wrong block (e.g. think it runs IKEv2 when it is IKEv1).')
    + '<p>Send the capture summary + debug lines + timeline in one message. Facts from your own gateway end the "it is your firewall" discussion much faster than describing the config.</p>'
    + '</div></div>'
    + '<div class="fs"><div class="fsn">5</div><div class="fsb"><div class="fst">Resolution</div>'
    + '<p>Interim step on our side: less strict DPD on the ASA so that it does not tear the tunnel down on short hiccups:</p>'
    + cb('Cisco ASA', `tunnel-group 203.0.113.104 ipsec-attributes
 isakmp keepalive threshold 30 retry 5`)
    + '<p>Result: the drops still happened, only a few minutes later than before &mdash; expected, it only extends the time before the peer is declared dead. It confirmed that DPD loss was a symptom, not the cause.</p>'
    + '<p>Recommendation sent to the partner:</p>'
    + cb('message', `The IKE gateway on your side is configured with IKE mode "auto", which initiates
IKEv1 Aggressive Mode as the first option. Our gateway does not permit Aggressive
Mode - hence the timeout and the log you see. No changes are required on our side.

Recommended: switch the gateway to IKEv2, which is already supported and configured
on our side for this peer.
Alternatively, if IKEv1 must be kept, set the IKE mode explicitly to Main Mode.`)
    + '<p>Follow-up hint sent: align the traffic selectors with our crypto ACL (one entry per our ACL line, no /32 shortcuts) and the timers with our policy (IKEv1: AES, SHA, DH 5, lifetime 86400) &mdash; or, better, do the IKEv2 migration jointly under a proper change request.</p>'
    + '<p>Outcome: the incident was lowered to low priority (short drops with auto-recovery, impact only on monitoring, no user complaints). The partner set <strong>Main Mode</strong> and adjusted <strong>DPD</strong>; the VPN has been stable since. The selector clean-up and the IKEv2 migration (needs a change request and an agreed weekend window with engineers on both sides) were left for later.</p>'
    + '<p>The partner\'s management still asked "did you change anything on your side?" &mdash; closing answer: the likely trigger was the partner\'s IKEv2 attempt with different selectors, and the gateway left on "auto" (occasional Aggressive Mode, not supported on our side); our side accepts IKEv1 and IKEv2; the migration needs a coordinated change with agreed parameters and matching selectors.</p>'
    + co('a', '&#x26A0;&#xFE0F;', 'DPD mismatch alone can drop tunnels', 'Very aggressive DPD on one side (short interval, few retries) tears the SA down on a short packet loss, while the other side still uses it &rarr; one-way traffic until the next rekey. Compare DPD interval / retries on both sides (ASA: <code>isakmp keepalive threshold … retry …</code> in the tunnel-group).')
    + '</div></div>'
    + '<div class="fs"><div class="fsn">6</div><div class="fsb"><div class="fst">Fix and lesson</div>'
    + '<ul style="margin:0 0 6px 20px"><li>Agree <strong>one</strong> parameter set in writing and have both sides fill it: IKE version, mode, auth (PSK/cert), local + remote IKE ID (type and value), public IPs (after NAT), phase 1 and 2 proposals, lifetimes, DPD, NAT-T, PFS, protected subnets.</li>'
    + '<li>Ask the partner for their <strong>current running config</strong> of the tunnel (sanitised), not their intention.</li>'
    + '<li>Never leave mode/version on <strong>auto</strong> for a site-to-site peer &mdash; set exactly what was agreed (version, Main Mode, proposals).</li>'
    + '<li>Keep <strong>DPD</strong> reasonable on both sides (seconds-level DPD turns every short hiccup into a full teardown) and align lifetimes.</li>'
    + '<li>Collect logs <strong>off the box</strong>: the local buffer on a busy firewall overwrites within minutes. Without syslog access, save a terminal-monitor session to a file on the jump host and run a capture on the box.</li>'
    + '<li>Answer the partner\'s open questions explicitly in one written summary (trigger, what was checked, next step) &mdash; otherwise the same question comes back a month later.</li>'
    + '<li>Take the chance to retire weak parameters: this tunnel still ran IKEv1 + AES128/SHA1 + DH group 5 &mdash; target IKEv2, AES-GCM, DH 19/20.</li>'
    + '<li>An IKE version migration is a <strong>synchronised event</strong>, not a one-sided experiment: agreed window, both sides online, same new parameter set, rollback plan &mdash; and leftovers of the other version removed completely.</li></ul>'
    + '</div></div>'
    + '</div>'
    + '<h2>Reading ASA phase 2 rekey logs</h2>'
    + '<p>Example from the same case (addresses replaced). The ASA rekeys a Child-SA and immediately sends a delete &mdash; is the new SA being killed?</p>'
    + cb('ASA syslog', `%ASA-5-713041: Group = 203.0.113.104, IKE Initiator: Rekeying Phase 2...
               local Proxy Address 198.51.100.151, remote Proxy Address 10.200.66.6
%ASA-5-713049: Security negotiation complete for LAN-to-LAN Group (203.0.113.104)
               Initiator, Inbound SPI = 0xcbb6bcc5, Outbound SPI = 0xd7c2638d      <- the NEW SA
%ASA-5-713120: PHASE 2 COMPLETED (msgid=3fcc2f05)
%ASA-7-715046: constructing IPSec delete payload
%ASA-7-715009: IKE Deleting SA: Remote Proxy 10.200.66.6, Local Proxy 198.51.100.151
               … delete confirmation references SPI 0x8b43a57b                     <- an OLD SPI`)
    + tbl(['Check', 'Conclusion'], [
      ['SPI in the delete = one of the <strong>new</strong> SPIs', 'the new SA is being torn down &rarr; real problem (policy/selector mismatch, peer rejects)'],
      ['SPI in the delete = an <strong>old</strong> SPI', 'normal cleanup of the previous SA after rekey &mdash; not the problem'],
    ])
    + co('a', '&#x26A0;&#xFE0F;', 'The real finding: a host-to-host SA next to subnet SAs', 'Proxies <code>/32 &harr; /32</code> while the agreement is subnet-to-subnet. Typical causes: a <code>host</code> line in the crypto ACL on one side, or partner proxy-IDs / traffic selectors defined per host. Then both host and subnet SAs exist in parallel and rekeys/recovery can collide.')
    + cb('Cisco ASA', `show crypto ipsec sa peer 203.0.113.104 | include local ident|remote ident|spi
show run access-list <crypto-acl>                    # any "host" entries?
show crypto ikev1 sa detail`)
    + '<h3>Why /32 against /16 produces host SAs (and instability)</h3>'
    + tbl(['Mechanism', 'Effect'], [
      ['<strong>IKEv2 traffic selector narrowing</strong> (RFC 7296): the responder may narrow the proposed selectors to the intersection with its policy', '/16 proposed vs /32 configured &rarr; an SA for one host only'],
      ['<strong>ASA as responder</strong> typically accepts a proxy that is a <strong>subset</strong> of its crypto ACL', 'their /32 inside our /16 is accepted &rarr; a separate host-to-host SA is built'],
      ['our side initiates for the /16, they initiate per host', 'parallel subnet and host SAs, one per host &rarr; many SAs, rekey collisions'],
      ['traffic from hosts not covered by their /32 list', 'no matching SA on their side &rarr; dropped &rarr; looks "intermittent" depending on the source host'],
    ])
    + co('t', '&#x1F4A1;', 'Rule', 'Selectors (crypto ACL / proxy-IDs / traffic selectors) must be <strong>identical and mirrored</strong> on both sides &mdash; same prefixes, same number of entries. Write them into the parameter sheet; never let one side "simplify" them to hosts or widen them to any.')
    + '<p>On the partner side (e.g. Palo Alto) the proxy-IDs must <strong>mirror the ASA crypto ACL exactly</strong> &mdash; same subnets, one proxy-ID per ACL line. Ask for their proxy-ID list and their IKE/IPsec logs for the same timestamps.</p>'
    + co('p', '&#x2139;&#xFE0F;', 'Better long-term', 'Move the peer to <strong>IKEv2</strong> with an FQDN/key-id identity: identity protected, NAT-T built in, fewer messages. See <a href="#cisco/vpn/theory">VPN / IPsec theory</a>.')
    + '</div>';
}

RENDERERS['theory/security/ike-nat'] = pgIKENat;
IDX.push(
  { t: 'IKE log with unknown private peer IP (NAT)', p: 'theory/security/ike-nat', k: 'ike phase-1 failed initiator aggressive mode failed sa private ip 172.16 nat timeout cookie', v: 'Remote side logs its own private IP; responder cookie 0 = no reply' },
  { t: 'Aggressive vs main mode (IKEv1)', p: 'theory/security/ike-nat', k: 'aggressive mode main mode ike id psk fqdn am-disable aggressive-mode disable', v: 'Aggressive mode selects PSK by IKE ID' },
  { t: 'Case: partner half-migrated IKEv1 -> IKEv2 and back', p: 'theory/security/ike-nat', k: 'ikev2 ikev1 migration mismatch invalid_major_version intermittent tunnel partner leftover config parameter sheet', v: 'Mixed config, intermittent tunnel, agree one parameter set' },
  { t: 'ASA phase 2 rekey delete: old vs new SPI', p: 'theory/security/ike-nat', k: 'asa 713041 713049 713120 715009 rekey phase 2 delete spi old sa cleanup host-to-host proxy id selector palo alto', v: 'Delete with an old SPI = normal cleanup' },
  { t: 'Host /32 vs subnet /16 selectors (narrowing)', p: 'theory/security/ike-nat', k: 'traffic selector narrowing rfc 7296 proxy id subset host /32 /16 crypto acl mirror ikev2', v: 'Mismatched selectors → host SAs, rekey collisions' },
  { t: 'show vpn-sessiondb Login Time as evidence', p: 'theory/security/ike-nat', k: 'show vpn-sessiondb l2l filter ipaddress login time duration tunnel rebuilt evidence asa capture 0 bytes', v: 'When the tunnel was last (re)established' },
  { t: 'Palo Alto IKE gateway auto -> aggressive mode', p: 'theory/security/ike-nat', k: 'palo alto ike gateway auto exchange mode aggressive main ikev2 dpd ikemgr', v: 'Set Main Mode / IKEv2 explicitly' },
  { t: '%ASA-4-402116 packet does not match SA policy', p: 'theory/security/ike-nat', k: '402116 decapsulated inner packet doesn\'t match negotiated policy proxy selector mismatch wrong sa', v: 'Peer put traffic into the wrong SA' },
  { t: 'ASA DPD loss: 713123 lost contact, 713259 lost service', p: 'theory/security/ike-nat', k: '713123 lost contact remote peer dpd keepalive 602304 713259 lost service 750003 ikev2 retransmissions', v: 'DPD declared peer dead → teardown → rebuild' },
  { t: 'Wireshark IKE: IKE_SA_INIT vs Identity Protection (Main Mode)', p: 'theory/security/ike-nat', k: 'wireshark isakmp ike_sa_init identity protection main mode aggressive quick mode ikev1 ikev2 capture', v: 'Which IKE version / mode is in the capture' },
  { t: 'ASA tries IKEv2 first, falls back to IKEv1', p: 'theory/security/ike-nat', k: 'asa crypto map ikev2 ikev1 fallback 750003 750001 retransmissions', v: 'Unanswered IKEv2 retries before IKEv1' },
  { t: 'Palo Alto IKE system log: ike-nego-p1, INVALID-SPI', p: 'theory/security/ike-nat', k: 'palo alto system log ike-nego-p1-start ike-nego-p1-succ ike-nego-p1-fail ike-recv-p2-delete ike-recv-notify invalid-spi initiator responder', v: 'Who rebuilt the tunnel, which mode, SA out of sync' },
  { t: 'DPD mismatch drops tunnels', p: 'theory/security/ike-nat', k: 'dpd dead peer detection keepalive threshold retry mismatch one-way', v: 'Compare DPD on both sides' },
  { t: 'NAT-T UDP 500 -> 4500', p: 'theory/security/ike-nat', k: 'nat-t udp 4500 500 nat detection ipsec', v: 'First packet always UDP 500' },
);
