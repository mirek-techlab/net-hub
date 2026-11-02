// pages-cisco.js — built-in pages from Mirek's work notes (Cisco IOS XR + ACI).
// Customer names, hostnames, tenants and public IPs were replaced with neutral examples
// (TN_A, apic1, 198.51.100.0/24 …) because this repository is public. Commands are unchanged.

// ═══════════════════════════════════════════════════════════════════
// IOS XR — static routes in VRF, commit workflow, BGP VRF checks
// ═══════════════════════════════════════════════════════════════════
function pgXRRouting() {
  return '<div class="ph"><div class="pt">IOS XR &mdash; VRF static routes, commits &amp; BGP</div>'
    + '<div class="ps">Add a static route in a VRF on a pair of WAN/core routers, verify it, check BGP in the VRF</div>'
    + '<div class="tags">' + tag('tp', 'Cisco') + tag('tp', 'IOS XR') + tag('tb', 'VRF') + tag('tb', 'Static') + tag('ta', 'BGP') + '</div></div>'
    + '<div class="content">'
    + co('p', '&#x2139;&#xFE0F;', 'This is IOS XR, not IOS XE', '<code>commit</code>, <code>show commit changes diff</code>, <code>router static vrf …</code> and <code>Bundle-Ether</code> are XR. On XE the equivalent is <code>ip route vrf &lt;VRF&gt; &lt;prefix&gt; &lt;mask&gt; &lt;nh&gt;</code> and changes apply immediately.')

    + '<h2>Change workflow (two-stage commit)</h2><div class="flow">'
    + '<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">Enter config and stage the change</div>'
    + cb('IOS XR', `configure
router static vrf TN_A-RD0 address-family ipv4 unicast 198.51.100.0/24 Bundle-Ether13.1031 100.64.1.10 description Customer_X`) + '</div></div>'
    + '<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">Review what will change &mdash; before committing</div>'
    + cb('IOS XR', `show commit changes diff        ! "+" = added, "-" = removed
show configuration              ! whole uncommitted target config`)
    + cb('output', `! IOS XR Configuration 7.3.2
   router static
    vrf TN_A-RD0
     address-family ipv4 unicast
+     198.51.100.0/24 Bundle-Ether13.1031 100.64.1.10 description Customer_X
     !`) + '</div></div>'
    + '<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">Commit (with a safety net)</div>'
    + cb('IOS XR', `commit                           ! normal
commit confirmed 300             ! auto-rollback in 300 s unless you type "commit" again
commit label CHG12345 comment "static for Customer_X"`)
    + co('t', '&#x2714;', 'Tip', 'Use <code>commit confirmed</code> for anything that could cut your own access (routing, ACL, interfaces). If the session dies, XR rolls back by itself.') + '</div></div>'
    + '<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">History and rollback</div>'
    + cb('IOS XR', `show configuration commit list               ! commit IDs, who, when, label
show configuration commit changes 1000000123  ! what a given commit changed
rollback configuration last 1                 ! undo the last commit
rollback configuration to 1000000123          ! go back to a specific point`) + '</div></div>'
    + '</div>'

    + '<h2>Dual-router pattern (site A / site B)</h2>'
    + '<p>Same prefix on both routers, each via its own sub-interface and next-hop:</p>'
    + cb('IOS XR', `! Router A
router static vrf TN_A-RD0 address-family ipv4 unicast 198.51.100.0/24 Bundle-Ether13.1031 100.64.1.10 description Customer_X
! Router B
router static vrf TN_A-RD0 address-family ipv4 unicast 198.51.100.0/24 Bundle-Ether13.1032 100.64.1.18 description Customer_X`)
    + co('a', '&#x26A0;&#xFE0F;', 'Interface + next-hop', 'Specifying both the exit interface and the next-hop is the safest form on XR: the route is withdrawn when the sub-interface goes down and no recursive lookup surprises. Make sure the next-hop is in the sub-interface subnet.')

    + '<h2>Verify the static route</h2>'
    + cb('IOS XR', `show running-config router static vrf TN_A-RD0
show route vrf TN_A-RD0 198.51.100.0/24        ! is it installed? (S = static)
show route vrf TN_A-RD0 static
show cef vrf TN_A-RD0 198.51.100.0/24          ! forwarding entry + adjacency
ping vrf TN_A-RD0 100.64.1.10                  ! next-hop reachable?`)
    + co('t', '&#x1F50E;', 'Route not in the table?', 'Usually the next-hop is not reachable out of that interface, the sub-interface is down (<code>show ipv4 vrf TN_A-RD0 interface brief</code>), or a better AD route already exists for the same prefix.')

    + '<h2>BGP in the VRF</h2>'
    + cb('IOS XR', `show bgp vrf TN_A-RD0 summary                                ! neighbors, state, prefixes received
show bgp vrf TN_A-RD0 neighbors 100.64.1.246 routes          ! routes received AND accepted (after policy)
show bgp vrf TN_A-RD0 neighbors 100.64.2.1 advertised-routes ! what we send to the peer
show bgp vrf TN_A-RD0 198.51.100.0/24                        ! best path + where it came from`)
    + tbl(['Command', 'Shows'], [
      ['<code>… neighbors X routes</code>', 'received from X <strong>and accepted</strong> by the inbound policy'],
      ['<code>… neighbors X received routes</code>', 'everything X sent, before policy &mdash; needs <code>soft-reconfiguration inbound always</code> under the neighbor AF'],
      ['<code>… neighbors X advertised-routes</code>', 'what we advertise to X (after outbound policy)'],
    ])
    + co('a', '&#x26A0;&#xFE0F;', 'eBGP on XR needs a route-policy', 'Without <code>route-policy … in</code> / <code>out</code> on an eBGP neighbor, XR sends and accepts <strong>nothing</strong> (summary shows the session up but 0 prefixes). Use at least <code>route-policy PASS</code> with <code>pass</code>.')
    + '<h3>Should the new static be advertised in BGP?</h3>'
    + cb('IOS XR', `show running-config router bgp | include "vrf TN_A-RD0|redistribute"
! if needed:
router bgp <ASN> vrf TN_A-RD0 address-family ipv4 unicast redistribute static route-policy STATIC-TO-BGP`)
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// ACI — moquery
// ═══════════════════════════════════════════════════════════════════
function pgACIMoquery() {
  return '<div class="ph"><div class="pt">ACI &mdash; moquery</div>'
    + '<div class="ps">Query the APIC object database (MIT) directly &mdash; "SQL for ACI" with Cisco class names</div>'
    + '<div class="tags">' + tag('tp', 'Cisco') + tag('tp', 'ACI') + tag('tb', 'APIC') + tag('ta', 'moquery') + '</div></div>'
    + '<div class="content">'

    + '<h2>Mental model &mdash; think in objects, not CLI</h2>'
    + cb('tree', `Tenant (fvTenant)
 └── VRF (fvCtx)            routing table = "Context"
      └── BD (fvBD)          L2/L3 boundary, subnets/gateway
           └── EPG (fvAEPg)   policy group (inside an Application Profile fvAp)
                └── Endpoint (fvCEp)  learned MAC/IP`)
    + co('t', '&#x1F9ED;', 'How to not get lost', 'Always ask: <strong>1)</strong> which object am I looking for? (<code>-c class</code>) <strong>2)</strong> what is it connected to? (<code>Rs…</code> relations) <strong>3)</strong> what is its full path? (<code>dn</code>)')

    + '<h2>Abbreviations</h2>'
    + tbl(['Short', 'Meaning', 'Idea'], [
      ['<code>fv</code>', 'fabric virtualization', 'the tenant policy model (BD, EPG, VRF, endpoints)'],
      ['<code>Ctx</code>', 'Context', 'VRF'],
      ['<code>BD</code>', 'Bridge Domain', 'L2/L3 segment'],
      ['<code>AEPg</code>', 'Application EPG', 'endpoint group'],
      ['<code>CEp</code>', 'Concrete Endpoint', 'a learned endpoint (MAC + IPs)'],
      ['<code>Rs</code> / <code>Rt</code>', 'Relation source / target', 'link between objects, e.g. <code>fvRsCtx</code> = BD &rarr; VRF'],
      ['<code>dn</code> / <code>rn</code>', 'Distinguished / Relative name', 'full path / last part of the path'],
      ['<code>tDn</code>', 'Target DN', 'the object a relation points to'],
      ['<code>epm</code>', 'Endpoint Manager', 'leaf process that learns endpoints'],
    ])

    + '<h2>Syntax</h2>'
    + cb('APIC bash', `moquery -c <class>                                 # all objects of a class
moquery -c fvBD -f 'fv.BD.name=="TN_A_Web_BD"'     # filter: package.Class.attribute
moquery -c l3extSubnet -f 'l3ext.Subnet.dn*"tn-TN_A/out-TN_A_Internet_L3Out"'   # * = contains
moquery -d 'uni/tn-TN_A/BD-TN_A_Web_BD'            # one object by its DN
moquery -d 'uni/tn-TN_A/BD-TN_A_Web_BD' -x 'query-target=children'   # its children
moquery -c fvBD -o json                            # JSON output`)
    + co('p', '&#x2139;&#xFE0F;', 'Filter = class name split', '<code>fvBD</code> &rarr; <code>fv.BD</code>, <code>fvCEp</code> &rarr; <code>fv.CEp</code>, <code>l3extSubnet</code> &rarr; <code>l3ext.Subnet</code>, <code>faultInst</code> &rarr; <code>fault.Inst</code>. Operators: <code>==</code>, <code>!=</code>, <code>*</code> (contains), <code>and</code>, <code>or</code>.')

    + '<h2>Classes you will use most</h2>'
    + tbl(['Class', 'What'], [
      ['<code>fvBD</code> / <code>fvAEPg</code> / <code>fvCtx</code>', 'BDs / EPGs / VRFs'],
      ['<code>fvRsCtx</code>', 'BD &rarr; VRF relation'],
      ['<code>fvRsBd</code>', 'EPG &rarr; BD relation'],
      ['<code>fvRsPathAtt</code>', 'EPG &rarr; static port binding (path + VLAN)'],
      ['<code>fvCEp</code> / <code>fvIp</code>', 'endpoints / all IPs of an endpoint'],
      ['<code>fvIfConn</code>', 'deployed EPG VLAN on a node/port'],
      ['<code>l3extSubnet</code>', 'external EPG subnets (L3Out)'],
      ['<code>l3extRsPathL3OutAtt</code>', 'L3Out interface / SVI path'],
      ['<code>l1PhysIf</code>', 'physical port (description, speed, admin state)'],
      ['<code>faultInst</code>', 'active faults'],
      ['<code>fabricLinkPolicy</code>, <code>fabricProtPol</code>', 'MCP policy, vPC protection policy'],
    ])

    + '<h2>grep / egrep helpers</h2>'
    + cb('bash', `-A 10   lines after match     -B 5  lines before     -C 5  both
egrep 'a|b'   OR match

egrep 'ctx|tnFvCtxName'                  # BD -> VRF
egrep 'BD-|fvBD'                         # bridge domains
egrep 'epg-|fvAEPg'                      # EPGs
egrep 'cep-|ip|mac'                      # endpoints
egrep 'rsctx|rsBDToOut|rscons|rsprov'    # relations`)
    + tbl(['Pattern', 'Meaning'], [['<code>rsctx</code>', 'BD &rarr; VRF'], ['<code>rsBDToOut</code>', 'BD &rarr; L3Out'], ['<code>rscons</code>', 'EPG consumes a contract'], ['<code>rsprov</code>', 'EPG provides a contract']])

    + '<h2>Recipes</h2>'
    + '<h3>BD &rarr; which VRF?</h3>'
    + cb('APIC bash', `moquery -c fvBD | egrep -A 10 'TN_A_Web_BD'
moquery -c fvRsCtx -f 'fv.RsCtx.dn=="uni/tn-TN_A/BD-TN_A_Web_BD/rsctx"'`)
    + cb('output (shortened)', `dn           : uni/tn-TN_A/BD-TN_A_Web_BD/rsctx     <- relation BD -> VRF
state        : formed                               <- "missing-target" = VRF does not exist
tDn          : uni/tn-TN_A/ctx-TN_A_VRF
tnFvCtxName  : TN_A_VRF                             <- the VRF ("ctx" in ACI terms)`)
    + '<h3>Endpoints</h3>'
    + cb('APIC bash', `moquery -c fvCEp -f 'fv.CEp.encap=="vlan-66"' | egrep 'ip|mac'   # all endpoints in a VLAN
moquery -c fvCEp | grep -E '10.10.10'                             # by subnet
moquery -c fvCEp | egrep 'dn|ip|mac' | grep TN_A_SAN_66_EPG       # in one EPG (dn confirms EPG, encap the VLAN)
moquery -c fvCEp | grep -A 20 50:EB:1A:B5:36:18                   # by MAC
moquery -c fvIp -f 'fv.Ip.addr=="10.20.30.40"'                    # by IP (also secondary IPs)`)
    + '<h3>Which EPG VLANs are deployed on a port</h3>'
    + cb('APIC bash', `moquery -c fvIfConn | grep dn | grep node-1226 | grep 'eth1/1]'`)
    + cb('output', `uni/epp/fv-[uni/tn-TN_A/ap-TN_A_Prod_AP/epg-TN_A_PSAN2_240_EPG]/node-1226/stpathatt-[eth1/1]/conndef/conn-[vlan-240]-[0.0.0.0]
             └ EPG                                          └ node   └ port              └ VLAN`)
    + co('a', '&#x26A0;&#xFE0F;', 'grep "eth1/1" also matches eth1/13, eth1/14 …', 'Include the closing bracket: <code>grep \'eth1/1]\'</code>, or in regex <code>\'pathep-\\[eth1/1\\]\'</code>.')
    + '<h3>L3Out</h3>'
    + cb('APIC bash', `moquery -c l3extSubnet | grep 198.51.100.                               # which ext EPG has this subnet
moquery -c l3extSubnet -f 'l3ext.Subnet.dn*"tn-TN_A/out-TN_A_Internet_L3Out"'
moquery -c l3extRsPathL3OutAtt | grep -E 'pathep-\\[eth1/1\\]' -B 2 | grep -E "dn|encap"
moquery -c l3extRsPathL3OutAtt | grep 'paths-1286/pathep-\\[eth1/1\\]' -B 5 -A 10`)
    + cb('output (shortened)', `ip     : 0.0.0.0/0
dn     : uni/tn-TN_A/out-TN_A_Internet_L3Out/instP-TN_A_Internet_any_L3OutEPG/extsubnet-[0.0.0.0/0]
scope  : import-security      <- "External Subnets for External EPG" (classification for contracts)`)
    + '<h3>Faults</h3>'
    + cb('APIC bash', `moquery -c faultInst -f 'fault.Inst.code=="F2533"' | egrep 'dn|descr|lc'
moquery -c faultInst -f 'fault.Inst.severity=="critical"' | egrep 'code|dn|descr'
moquery -c faultInst | grep -B3 -A15 'eth1/52'                   # faults on one port`)
    + co('a', '&#x26A0;&#xFE0F;', 'Correction to the original note', 'The original line used <code>-c faultInfo</code> with <code>fault.Info.code</code>. <code>faultInfo</code> is an abstract class; query <code>faultInst</code> and filter on <code>fault.Inst.code</code>. Your note says F2533 = MCP err-disabled port &mdash; confirm with the fault <code>descr</code>.')
    + '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// ACI — APIC CLI troubleshooting + port troubleshooting
// ═══════════════════════════════════════════════════════════════════
function pgACITshoot() {
  return '<div class="ph"><div class="pt">ACI &mdash; Troubleshooting (APIC CLI)</div>'
    + '<div class="ps">Fabric health, endpoints, EPG/port config, external EPGs and a port troubleshooting chain</div>'
    + '<div class="tags">' + tag('tp', 'Cisco') + tag('tp', 'ACI') + tag('tb', 'APIC CLI') + tag('ta', 'Endpoints') + tag('tr', 'Port') + '</div></div>'
    + '<div class="content">'
    + co('p', '&#x2139;&#xFE0F;', 'Where to run', 'All commands from the APIC CLI (ssh to the APIC). <code>fabric &lt;node-id&gt; show …</code> runs a show command on a leaf/spine from the APIC. Lab to practise: <a href="https://sandboxapicdc.cisco.com/" target="_blank" rel="noopener">Cisco DevNet always-on APIC sandbox</a> (credentials are on the DevNet sandbox page).')

    + '<h2>Fabric / APIC health</h2>'
    + tbl(['Command', 'What it tells you'], [
      ['<code>acidiag fnvread</code>', 'all registered switches: node ID, name, TEP IP, pod, state'],
      ['<code>acidiag rvread</code>', 'APIC cluster replication / data-layer health (all should be "fully fit")'],
      ['<code>acidiag avread</code>', 'APIC cluster view &mdash; versions, health of each controller'],
    ])

    + '<h2>Endpoints</h2>'
    + cb('APIC CLI', `show endpoints ip 10.20.30.40
show endpoints mac 00:50:56:80:95:1B
show endpoints vlan 3184`)
    + cb('output (shortened)', `Tenant      : TN_A
Application : TN_A_Main_AP
AEPg        : TN_A_Admin-Server1_635_EPG

 End Point MAC      IP Address     Source   Node  Interface  Encap
 00:50:56:80:95:1B  10.20.30.40    learned  1203  eth1/2     vlan-635`)
    + co('t', '&#x1F50E;', 'Reading it', '<strong>Node + Interface</strong> = where the endpoint is physically learned; <strong>Encap</strong> = VLAN on the wire, which must match the EPG static binding / VMM port-group.')
    + '<h3>Ping sweep a subnet from the APIC (populate ARP / find live hosts)</h3>'
    + cb('bash', `for i in {1..254}; do ping -c1 -W1 10.10.10.$i & done`)

    + '<h2>EPG, VRF and routing</h2>'
    + cb('APIC CLI', `show epg TN_A_Admin-Server1_635_EPG detail      # all endpoints + bindings of an EPG
show tenant TN_A contract                       # contracts in a tenant
show vrf
fabric 2284 show ip route vrf TN_A:TN_A_Main_VRF  # routing table on a leaf (tenant:vrf)`)

    + '<h2>Port configuration</h2>'
    + cb('APIC CLI', `show running-config leaf 1203 interface ethernet 1/2`)
    + cb('output (shortened)', `leaf 1203
  interface ethernet 1/2
    # policy-group P_L1203_2_IntPG
    switchport trunk allowed vlan 1013 tenant TN_B application TN_B_Prod_AP epg TN_B_Prod_1013_EPG
    switchport trunk allowed vlan 635  tenant TN_A application TN_A_Main_AP epg TN_A_Admin-Server1_635_EPG
    ...`)
    + cb('APIC CLI', `show running-config template policy-group P_L1203_2_IntPG`)
    + cb('output (shortened)', `template policy-group P_L1203_2_IntPG
  description 'esx01_slot5_port1'
  no lldp receive / no lldp transmit
  vlan-domain member TN_Phy type phys
  vlan-domain member TN_L3OutD type l3ext
  spanning-tree bpdu-filter enable
  speed 10G
  no negotiate auto
  storm-control broadcast level 30.00 burst-rate 30.00
  storm-control action drop`)
    + co('a', '&#x26A0;&#xFE0F;', 'What to check in the policy group', 'Speed / auto-negotiation must match the server NIC. With LLDP/CDP off you lose neighbor visibility. <code>vlan-domain member</code> must include the domain whose VLAN pool contains the EPG VLAN.')

    + '<h2>External EPGs (L3Out)</h2>'
    + cb('APIC CLI', `show external-l3 epg name TN_A_Main_WAN_L3OutEPG
show external-l3 epg tenant TN_A vrf TN_A_Main_VRF detail`)
    + '<p>Use it to find <strong>on which external EPG an external subnet is configured</strong>. Background on the <a href="#cisco/aci/theory" style="color:var(--teal)">Theory</a> page.</p>'

    + '<h2>Port troubleshooting chain</h2>'
    + '<p>Mental shortcut: <strong>port &rarr; selector &rarr; Interface Policy Group &rarr; Link-level policy</strong>. To compare two ports quickly, steps <strong>6 + 7 + 8</strong> give the most.</p>'
    + '<div class="flow">'
    + '<div class="fs"><div class="fsn">1</div><div class="fsb"><div class="fst">Find the physical port by description</div>' + cb('APIC bash', `moquery -c l1PhysIf | egrep -B5 -A15 -i 'hostname|server'`) + '</div></div>'
    + '<div class="fs"><div class="fsn">2</div><div class="fsb"><div class="fst">Port selector / port block</div>' + cb('APIC bash', `moquery -c infraPortBlk | egrep -B5 -A10 'hostname|P_L1226_52_IntSel'`) + '</div></div>'
    + '<div class="fs"><div class="fsn">3</div><div class="fsb"><div class="fst">Selector &rarr; Interface Policy Group</div>' + cb('APIC bash', `moquery -c infraRsAccBaseGrp | egrep -A20 'P_L1226_52_IntSel' | egrep 'dn|tDn'`) + '</div></div>'
    + '<div class="fs"><div class="fsn">4</div><div class="fsb"><div class="fst">Policy Group &rarr; Link-level policy</div>' + cb('APIC bash', `moquery -c infraRsHIfPol | egrep -A20 'P_L1226_52_IntPG' | egrep 'dn|tDn'`) + '</div></div>'
    + '<div class="fs"><div class="fsn">5</div><div class="fsb"><div class="fst">Show the link-level policy (speed, autoneg, FEC)</div>' + cb('APIC bash', `moquery -c fabricHIfPol | egrep -A20 '1G_LLPol'`) + '</div></div>'
    + '<div class="fs"><div class="fsn">6</div><div class="fsb"><div class="fst">Runtime state of the port</div>' + cb('APIC CLI', `fabric 1226 show interface eth1/52 | egrep -i 'is up|duplex|auto-negotiation|input packets|output packets|CRC|drop|error'`) + '</div></div>'
    + '<div class="fs"><div class="fsn">7</div><div class="fsb"><div class="fst">MAC learning on the port</div>' + cb('APIC CLI', `fabric 1226 show mac address-table interface eth1/52`) + '</div></div>'
    + '<div class="fs"><div class="fsn">8</div><div class="fsb"><div class="fst">Endpoints on the port</div>' + cb('APIC CLI', `fabric 1226 show system internal epm endpoint interface eth1/52`) + '</div></div>'
    + '<div class="fs"><div class="fsn">+</div><div class="fsb"><div class="fst">EPG VLAN not coming up on the port? Check the access chain</div>'
    + cb('APIC bash', `moquery -c infraRsAttEntP | egrep -A10 'P_L1226_52_IntPG' | egrep 'dn|tDn'   # IntPG -> AAEP
moquery -c infraRsDomP   | egrep 'dn|tDn'                                   # AAEP -> domains
moquery -c infraRsVlanNs | egrep 'dn|tDn'                                   # domain -> VLAN pool
moquery -c faultInst -f 'fault.Inst.code=="F0467"' | egrep 'dn|descr'       # EPG deployment failed (invalid VLAN/path)`)
    + co('a', '&#x26A0;&#xFE0F;', 'Most common cause', 'The EPG VLAN is not in the VLAN pool of a domain that is both <strong>associated to the EPG</strong> and <strong>attached to the port\'s AAEP</strong> &rarr; fault F0467, the VLAN never gets programmed.')
    + '</div></div>'
    + '</div></div>';
}

// ═══════════════════════════════════════════════════════════════════
// ACI — theory
// ═══════════════════════════════════════════════════════════════════
function pgACITheory() {
  return '<div class="ph"><div class="pt">ACI &mdash; Theory &amp; object model</div>'
    + '<div class="ps">Tenant policy model, access policies, domains and external EPGs &mdash; for a quick refresh</div>'
    + '<div class="tags">' + tag('tp', 'Cisco') + tag('tp', 'ACI') + tag('tb', 'Policy model') + tag('ta', 'L3Out') + '</div></div>'
    + '<div class="content">'

    + '<h2>Two halves of the configuration</h2>'
    + tbl(['Tenant policies (logical, <code>fv*</code>)', 'Access policies (physical, <code>infra*</code>)'], [
      ['Tenant &rarr; VRF &rarr; BD (subnets) &rarr; Application Profile &rarr; EPG', 'VLAN pool &rarr; Domain &rarr; AAEP &rarr; Interface Policy Group &rarr; Interface profile/selector &rarr; Switch profile'],
      ['<em>what</em> talks to <em>what</em> (contracts)', '<em>where</em> and on <em>which VLANs</em> it may be deployed'],
    ])
    + '<p>They meet in two places: the <strong>EPG is associated to a domain</strong>, and the <strong>port\'s AAEP contains that domain</strong>. The EPG VLAN must be inside the domain\'s VLAN pool.</p>'
    + cb('tree', `Tenant
 └── VRF (Ctx)  ............ routing table
      └── BD  ................ L2 flood domain + gateway subnets
           └── EPG  ............ policy group  ── consumes/provides ──> Contract
                └── Endpoint

VLAN pool ─> Domain ─> AAEP ─> Interface Policy Group ─> port selector ─> leaf profile`)

    + '<h2>Domains</h2>'
    + tbl(['Type', 'Used for'], [
      ['Physical domain', 'bare-metal servers, static port bindings'],
      ['VMM domain', 'VMware/Hyper-V integration &mdash; APIC pushes port-groups, VLANs from a dynamic pool'],
      ['L2 external domain', 'L2Out &mdash; extending a BD to an external L2 network'],
      ['L3 (routed) external domain', 'L3Out &mdash; routing to external routers'],
    ])
    + '<p>Short version: <strong>internal</strong> = how endpoints attach (bare-metal / VMM); <strong>external</strong> = how you connect outside (L2 or L3).</p>'

    + '<h2>External EPGs (L3Out)</h2>'
    + '<ul style="margin:0 0 10px 20px">'
    + '<li>An external EPG is <strong>not used for routing</strong>. The L3Out does the routing &mdash; whether it has one or ten external EPGs, the routes on the border leafs are the same.</li>'
    + '<li>The external EPG is used for <strong>policy enforcement</strong>: contracts are applied to it, and subnets with scope <em>External Subnets for External EPG</em> (<code>import-security</code>) classify outside traffic into it.</li>'
    + '<li>Longest-prefix match decides which external EPG an outside IP falls into; <code>0.0.0.0/0</code> catches everything else.</li>'
    + '<li>Find where a subnet is classified: <code>show external-l3 epg …</code> or <code>moquery -c l3extSubnet | grep &lt;subnet&gt;</code>.</li>'
    + '</ul>'
    + tbl(['Subnet scope flag', 'Effect'], [
      ['External Subnets for External EPG (<code>import-security</code>)', 'classification for contracts'],
      ['Export Route Control (<code>export-rtctrl</code>)', 'advertise this prefix out of the L3Out (transit)'],
      ['Import Route Control (<code>import-rtctrl</code>)', 'accept this prefix in (only if import enforcement is on)'],
      ['Shared Route Control / Shared Security', 'leak to / classify for other VRFs'],
    ])

    + '<h2>Contracts in one paragraph</h2>'
    + '<p>EPGs cannot talk to each other by default (unless the VRF is <em>unenforced</em> or they use vzAny/preferred group). A <strong>provider</strong> EPG offers a contract (subjects &rarr; filters = ports/protocols), a <strong>consumer</strong> EPG uses it. In moquery: <code>fvRsProv</code> / <code>fvRsCons</code>.</p>'
    + '</div>';
}

Object.assign(RENDERERS, {
  'cisco/iosxe/routing': pgXRRouting,
  'cisco/aci/moquery': pgACIMoquery,
  'cisco/aci/tshoot': pgACITshoot,
  'cisco/aci/theory': pgACITheory,
});

IDX.push(
  { t: 'IOS XR show commit changes diff', p: 'cisco/iosxe/routing', k: 'xr commit diff configuration rollback confirmed', v: 'Review staged config before commit; commit confirmed; rollback configuration last 1' },
  { t: 'IOS XR static route in VRF', p: 'cisco/iosxe/routing', k: 'router static vrf address-family ipv4 unicast bundle-ether next-hop', v: 'router static vrf <VRF> address-family ipv4 unicast <prefix> <intf> <nh> description …' },
  { t: 'BGP VRF advertised / received routes', p: 'cisco/iosxe/routing', k: 'show bgp vrf neighbors routes advertised-routes received summary', v: 'show bgp vrf <VRF> neighbors <ip> routes | advertised-routes' },
  { t: 'acidiag fnvread / rvread / avread', p: 'cisco/aci/tshoot', k: 'acidiag fnvread rvread avread apic cluster health nodes', v: 'Switch list, APIC replication health, APIC versions' },
  { t: 'ACI show endpoints ip / vlan', p: 'cisco/aci/tshoot', k: 'show endpoints ip mac vlan epg aci apic', v: 'Where an endpoint is learned: node, interface, encap' },
  { t: 'ACI port troubleshooting chain', p: 'cisco/aci/tshoot', k: 'l1physif infraportblk infrarsaccbasegrp infrarshifpol fabrichifpol port selector policy group', v: 'port -> selector -> IntPG -> link-level policy' },
  { t: 'moquery basics & filters', p: 'cisco/aci/moquery', k: 'moquery -c -f -d class filter dn mit', v: "moquery -c fvBD -f 'fv.BD.name==\"X\"'" },
  { t: 'moquery BD -> VRF (fvRsCtx)', p: 'cisco/aci/moquery', k: 'fvrsctx bd vrf ctx tnfvctxname rsctx', v: 'BD to VRF relation, state formed / missing-target' },
  { t: 'moquery endpoints fvCEp', p: 'cisco/aci/moquery', k: 'fvcep fvip endpoint mac ip encap vlan', v: "moquery -c fvCEp -f 'fv.CEp.encap==\"vlan-66\"'" },
  { t: 'moquery faults faultInst', p: 'cisco/aci/moquery', k: 'faultinst fault code f2533 f0467 mcp err-disabled', v: "moquery -c faultInst -f 'fault.Inst.code==\"F2533\"'" },
  { t: 'ACI external EPG / L3Out subnets', p: 'cisco/aci/theory', k: 'external epg l3out l3extsubnet import-security export-rtctrl contracts', v: 'External EPG = policy, not routing' },
  { t: 'ACI access policies: VLAN pool, domain, AAEP', p: 'cisco/aci/theory', k: 'aaep domain vlan pool physical vmm l3 external access policy', v: 'VLAN pool -> Domain -> AAEP -> IntPG -> selector' },
);

// ═══════════════════════════════════════════════════════════════════
// ASR1000 / IOS XE — crash, system report, dmesg (from a real case, anonymised)
// ═══════════════════════════════════════════════════════════════════
(function () {
  const sub = TREE.find(t => t.id === 'cisco').subs.find(s => s.id === 'iosxe');
  if (!sub.pages.some(p => p.id === 'asr-crash')) sub.pages.push({ id: 'asr-crash', label: 'ASR1000: crash & system report' });
})();

function pgASRCrash() {
  return '<div class="ph"><div class="pt">ASR1000 / IOS XE &mdash; crash, system report &amp; dmesg</div>'
    + '<div class="ps">After an unexpected reload: where the evidence is, how to read it, what to send to TAC</div>'
    + '<div class="tags">' + tag('tp', 'Cisco') + tag('tp', 'ASR1000') + tag('tp', 'IOS XE') + tag('tr', 'Crash') + tag('ta', 'RCA') + '</div></div>'
    + '<div class="content">'

    + '<h2>1. First minutes after the reload</h2>'
    + cb('IOS XE', `show version | include uptime|reason|image        # last reload reason
show platform                                     # RP / ESP / SIP state, all "ok"?
show logging | include ECC|ABORT|CRASH|crash|EZMAN|EXMEM
dir bootflash:core/                               # system reports + core files, newest first
dir crashinfo:                                    # older platforms / additional crash files
show environment all                              # temperatures, voltages, PSUs`)
    + co('a', '&#x26A0;&#xFE0F;', 'Save the evidence before anything else', 'Copy the newest <code>bootflash:core/*system-report*.tar.gz</code> (and core files) off the box, e.g. <code>copy bootflash:core/&lt;file&gt; scp://…</code>. A second crash or a cleanup can overwrite them.')

    + '<h2>2. What is in a system report</h2>'
    + '<p>IOS XE creates it automatically when a process crashes or a card reloads: a <code>.tar.gz</code> with trace logs, outputs of many show / Linux commands and the kernel log. Each file starts with a header like:</p>'
    + cb('file', `**********************************
OUTPUT OF dmesg
**********************************
…
real	0m0.010s     <- the collector timed every command
user	0m0.005s
sys	0m0.006s`)
    + tbl(['Look at', 'Why'], [
      ['IOS log (<code>show logging</code> output in the report)', 'the actual error message, e.g. <code>%EZMAN_CLIENT-2-ECC_DOUBLE_BIT_ERROR</code>'],
      ['process exit: <code>rc=134</code> / <code>SIGABRT</code>', 'the process aborted itself after detecting a fatal error (134 = 128 + signal 6)'],
      ['trace logs of that process', 'what it did just before &mdash; usually read by TAC'],
      ['dmesg (Linux kernel log of the RP)', 'hardware/driver events on the RP: NIC resets, disk, PCI. <strong>Data-plane (QFP/NP) memory errors are not here</strong> &mdash; they are logged by the IOS processes.'],
    ])

    + '<h2>3. Example timeline (real case, anonymised)</h2>'
    + tbl(['Time (UTC)', 'Event'], [
      ['day 0, 15:06', 'planned reload (upgrade to 17.9.x); kernel sets clock, NP manager process starts at 15:08'],
      ['day 12, 13, 17, 22', 'dmesg: <code>NETDEV WATCHDOG: eth5 (igb): transmit queue 6 timed out</code> &rarr; <code>Reset adapter</code> &rarr; link up again'],
      ['day 23, 16:56', '<code>%EZMAN_CLIENT-2-ECC_DOUBLE_BIT_ERROR</code> in the NP DRAM; process terminated <code>rc=134 (SIGABRT)</code>'],
      ['day 23, 17:00', 'router reloads, system report generated, traffic restored'],
    ])

    + '<h2>4. ECC errors in one paragraph</h2>'
    + tbl(['Type', 'Meaning', 'Action'], [
      ['Single-bit (correctable)', 'memory corrected one flipped bit, traffic unaffected', 'watch counters; a rising rate means failing memory'],
      ['Double-bit (uncorrectable)', 'data cannot be trusted &rarr; the process aborts &rarr; card / router reloads', 'TAC case; RMA if it repeats or TAC confirms hardware'],
    ])
    + cb('IOS XE', `show logging | include ECC
show platform hardware qfp active infrastructure exmem statistics
show environment all`)
    + co('p', '&#x2139;&#xFE0F;', 'Do not over-interpret diagnostic values', 'Fields like Device/Bank/Row/Column = <code>0xFFFFFFFF</code> usually mean "could not be read" (the process was already aborting) &mdash; not proof of physical damage by themselves. One event can be a transient soft error; repeated events point to hardware. Let TAC decide on RMA.')

    + '<h2>5. Reading dmesg</h2>'
    + '<p>Timestamps are <strong>seconds since boot</strong>. Convert them with the epoch from the line <code>rtc_cmos … setting system clock to 2026-05-17T15:06:36 UTC (1779030396)</code>:</p>'
    + cb('bash', `boot=1779030396                      # epoch from the rtc_cmos line
for s in 1099774 1532589 1955969; do
  echo "$s s -> $(date -u -d @$((boot + s)) '+%Y-%m-%d %H:%M UTC')"
done
# 1099774 s -> 2026-05-30 08:36 UTC   (dmesg can drift a few minutes — use ± a few minutes when correlating)`)
    + tbl(['Line', 'Meaning'], [
      ['<code>NETDEV WATCHDOG: eth5 (igb): transmit queue N timed out</code> + <code>Reset adapter</code>', 'a NIC of the RP stopped transmitting; the driver reset it (~0.1 s). On this box <code>eth5</code> was an <strong>internal</strong> link (MTU 2048, TIPC starts on it) &mdash; most likely the RP &harr; ESP/SIP control channel (derived). Correlate with control-plane flaps (BGP/BFD) at the same times.'],
      ['<code>mgmtbr: port 1(eth2) …</code>', 'the management port (GigabitEthernet0) bridge &mdash; flapping during boot is normal'],
      ['<code>BAR … failed to assign</code>, <code>can\'t claim BAR</code>', 'PCI resource messages at boot &mdash; normal'],
      ['<code>SRBDS: Vulnerable</code>, <code>MMIO Stale Data: Unknown</code>', 'CPU vulnerability status &mdash; informational'],
      ['<code>ata6: SATA link down</code>', 'no hard disk installed (eUSB bootflash only) &mdash; normal'],
    ])

    + '<h2>6. Open the TAC case with</h2>'
    + '<ul style="margin:0 0 10px 22px"><li>the system report (<code>bootflash:core/…tar.gz</code>) and core files</li>'
    + '<li><code>show tech-support</code> (and the platform variant if TAC asks), <code>show logging</code>, <code>show version</code>, <code>show inventory</code> (serial numbers)</li>'
    + '<li>a short timeline (last planned reload, the error, the reload, recovery) in UTC</li>'
    + '<li>other hardware observations in the same period (e.g. the NIC resets in dmesg) &mdash; two different hardware symptoms on one chassis support an RMA</li>'
    + '<li>what you want: root cause + RMA decision</li></ul>'
    + '</div>';
}

RENDERERS['cisco/iosxe/asr-crash'] = pgASRCrash;
IDX.push(
  { t: 'ASR1000 crash: system report & core files', p: 'cisco/iosxe/asr-crash', k: 'asr1000 crash reload system report bootflash core tar.gz crashinfo tac rma', v: 'dir bootflash:core/ — save, read, send to TAC' },
  { t: 'ECC double-bit error (EZMAN / QFP)', p: 'cisco/iosxe/asr-crash', k: 'ecc double bit single bit ezman_client np5c qfp exmem sigabrt rc=134', v: 'Uncorrectable memory error → process abort → reload' },
  { t: 'Read dmesg: convert timestamps, NIC reset', p: 'cisco/iosxe/asr-crash', k: 'dmesg timestamp seconds since boot epoch netdev watchdog igb reset adapter transmit queue timed out', v: 'date -u -d @$((boot + s))' },
);

// ═══════════════════════════════════════════════════════════════════
// NX-OS — interface discards & queuing (Nexus 7000-style templates)
// ═══════════════════════════════════════════════════════════════════
(function () {
  const cisco = TREE.find(t => t.id === 'cisco');
  if (!cisco.subs.some(s => s.id === 'nxos')) cisco.subs.push({ id: 'nxos', label: 'Nexus / NX-OS', pages: [{ id: 'discards', label: 'Discards & queuing' }] });
})();

function pgNXDiscards() {
  return '<div class="ph"><div class="pt">NX-OS &mdash; interface discards &amp; queuing</div>'
    + '<div class="ps">Where packets are dropped on a Nexus port-channel uplink, how to read the queuing statistics and when the numbers actually matter</div>'
    + '<div class="tags">' + tag('tp', 'Cisco') + tag('tp', 'Nexus') + tag('tp', 'NX-OS') + tag('tb', 'QoS') + tag('ta', 'Port-channel') + '</div></div>'
    + '<div class="content">'
    + '<p>Example: a VRF uplink to a WAN router over <code>port-channel10</code> = 2 &times; 10G (<code>Eth1/11</code>, <code>Eth2/11</code>, on two line cards). Queuing templates <code>4q8e</code> / <code>1p3q1t-8e</code> / <code>2q4t-8e</code> are Nexus 7000/7700 style.</p>'

    + '<h2>1. Error counters</h2>'
    + cb('NX-OS', `show interface port-channel 10 counters errors
show interface ethernet 1/11 counters errors`)
    + cb('output (shortened)', `Port   Align-Err FCS-Err Xmit-Err Rcv-Err UnderSize OutDiscards
Po10           0       1        0       1         0      885730
Port   InDiscards
Po10       583075

Eth1/11 OutDiscards 809169   InDiscards 298657`)
    + tbl(['Counter', 'Meaning'], [
      ['FCS / Align / Symbol errors', 'physical layer: optics, cable, patch panel &mdash; should be 0 and not growing'],
      ['<code>InDiscards</code>', 'received fine but dropped on ingress (ingress queue full, policing, internal congestion)'],
      ['<code>OutDiscards</code>', 'dropped on egress; if the egress <em>queues</em> show 0 drops, look elsewhere (ACL / policy, fabric / internal path)'],
    ])

    + '<h2>2. Queuing statistics</h2>'
    + cb('NX-OS', `show queuing interface ethernet 1/11          # template, queues, CoS mapping
show policy-map interface ethernet 1/11       # per-queue transmit / drop counters
show policy-map interface ethernet 1/11 | include dropped`)
    + cb('output (shortened)', `Service-policy (queuing) input:   default-4q-8e-in-policy
  Class-map (queuing): 2q4t-8e-in-q1        (CoS 5-7)  queue dropped pkts : 0
  Class-map (queuing): 2q4t-8e-in-q-default (CoS 0-4)  queue dropped pkts : 583075   <- = Po10 InDiscards
                                                        queue transmit pkts: 14473935313548
Service-policy (queuing) output:  default-4q-8e-out-policy
  1p3q1t-8e-out-pq1 (priority, CoS 5-7)   dropped 0
  1p3q1t-8e-out-q2  (CoS 3-4)             dropped 0
  1p3q1t-8e-out-q3  (CoS 2)               dropped 0
  1p3q1t-8e-out-q-default (CoS 0-1)       dropped 0`)
    + tbl(['Finding', 'Reading'], [
      ['ingress default queue drops = <code>InDiscards</code>', 'drops happen on <strong>ingress</strong>, best-effort traffic &mdash; typical for short bursts filling the ingress buffer'],
      ['all egress queues 0 drops, but <code>OutDiscards</code> &gt; 0', 'egress discards are not caused by the queuing policy'],
      ['583 075 drops against ~14 &times; 10<sup>12</sup> packets', '&asymp; 0.000004 % over the whole lifetime &mdash; negligible as an average'],
      ['identical numbers for both members', 'statistics shared for the port-channel / module &mdash; do not attribute them to one link; use per-interface counters'],
    ])
    + co('a', '&#x26A0;&#xFE0F;', '"Last clearing … never"', 'Lifetime counters say nothing about <em>now</em>. Clear them, then measure the <strong>increase</strong> during normal load and during the reported problem.')
    + cb('NX-OS', `clear counters interface port-channel 10
clear qos statistics
! … wait / reproduce …
show interface port-channel 10 counters errors
show policy-map interface ethernet 1/11 | include dropped
show interface ethernet 1/11 | include rate|discard`)

    + '<h2>3. Port-channel load balancing</h2>'
    + cb('NX-OS', `show port-channel traffic
show port-channel load-balance`)
    + cb('output (shortened)', `ChanId  Port     Rx-Ucst  Tx-Ucst
10      Eth1/11  33.46%   52.25%
10      Eth2/11  66.53%   47.74%

IP: src-dst ip rotate 0`)
    + tbl(['Observation', 'Meaning'], [
      ['Tx balanced (52/48)', 'our hash (<code>src-dst ip</code>) spreads well'],
      ['Rx 33/67', 'the <strong>neighbour</strong> decides which member it sends on &mdash; its hash, not ours'],
      ['few large flows between few IP pairs', 'IP-only hashing cannot spread them; including L4 ports helps: <code>port-channel load-balance src-dst ip-l4port</code> (on the sending side)'],
    ])
    + co('p', '&#x2139;&#xFE0F;', 'Note', '<code>show port-channel traffic</code> shows shares since the member counters were last cleared &mdash; clear them for a current picture.')

    + '<h2>4. SVI counters</h2>'
    + cb('NX-OS', `show interface vlan 552`)
    + cb('output (shortened)', `Vlan552 is up, line protocol is up
  Internet Address is 100.96.144.130/26
  60 seconds input rate 77176 bits/sec, 66 packets/sec
  L3 Switched: input: 14455066563 pkts - output: 1993816313 pkts`)
    + '<p>Good for a quick rate check of one VRF/VLAN on the uplink; the physical drops are on the member interfaces, not on the SVI.</p>'
    + '</div>';
}

RENDERERS['cisco/nxos/discards'] = pgNXDiscards;
IDX.push(
  { t: 'NX-OS InDiscards / OutDiscards on port-channel', p: 'cisco/nxos/discards', k: 'nexus nx-os indiscards outdiscards counters errors port-channel discards drops', v: 'Ingress queue drops vs egress discards' },
  { t: 'NX-OS queuing: show policy-map interface dropped', p: 'cisco/nxos/discards', k: 'nexus 7000 4q8e 1p3q1t 2q4t queuing policy-map interface queue dropped cos', v: 'Read per-queue drops; clear and measure the increase' },
  { t: 'Port-channel load balance src-dst ip-l4port', p: 'cisco/nxos/discards', k: 'show port-channel traffic load-balance src-dst ip l4port hash imbalance rx tx', v: 'Rx imbalance is the neighbour hash' },
);
