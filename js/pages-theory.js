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
