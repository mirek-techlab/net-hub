# Routing design

## Underlay
- eBGP on every leaf–spine link, one session per /31. No IGP. [documented: Nokia uses an RFC 7938
  style BGP underlay in the SR Linux EVPN tutorials]
- Both spines share AS 65100; each leaf has its own AS (65001, 65002). Leaf-to-leaf paths
  therefore look like `65100 650xx`.
- Leaves advertise their connected client /24 and the fabric /31s.

## Policy
- One permissive policy `all` (default-action accept) used as import and export on every group.
  [documented: same pattern as Nokia's L2 EVPN tutorial, where an eBGP peer needs an export/import
  policy to advertise and install routes]
- Lab simplification. A real fabric would export only loopbacks / client prefixes via a prefix-set.

## Open questions to answer in the lab
- Does each leaf install **both** spine paths (ECMP), or only one? SR Linux may need multipath
  configured — check the route table and the docs, then decide. _TODO_
- How long does traffic stop when one spine link goes down, with default BGP timers vs. when the
  interface goes down? See `testing/failover-testing.md`.

## Next step (separate lab)
Loopbacks (`system0`), iBGP EVPN overlay and a VXLAN service on top of this underlay.
