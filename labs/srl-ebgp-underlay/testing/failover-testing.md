# Failover testing

Run a continuous ping during each test and count the lost packets:
```bash
docker exec -it clab-srl-ebgp-client1 ping -i 0.2 10.12.0.10
```
Note: without a licence the SR Linux datapath is limited to 1000 PPS — far above this ping rate.

## Test 1 — leaf1 uplink to spine1 down
On leaf1:
```
enter candidate
set / interface ethernet-1/1 admin-state disable
commit now
```
Observe BGP to spine1 drop and traffic move to spine2. Restore with `admin-state enable`.

| Item | Result |
|---|---|
| Lost pings | _TODO_ |
| BGP state change seen | _TODO_ |
| Path after failure (traceroute) | _TODO_ |

## Test 2 — whole spine down
Stop spine1 with containerlab (the docs advise containerlab stop/start rather than docker for SR Linux):
```bash
sudo containerlab stop --help    # check the exact syntax for one node on your version
```
| Item | Result |
|---|---|
| Lost pings | _TODO_ |
| Recovery after start | _TODO_ |

## Test 3 (idea) — silent failure
Drop traffic without the interface going down (e.g. `containerlab tools netem` on the link) and
compare with Test 1: here only BGP hold timers detect it. _TODO: check netem syntax, run, compare_

## Conclusions
_TODO — what was measured, and what it says about control-plane vs data-plane convergence._
