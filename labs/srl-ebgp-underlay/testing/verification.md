# Verification

Fill in with real output after `containerlab deploy`. Commands are from SR Linux docs / tutorials;
if one fails on the image version used, note the correct one here.

## 1. Nodes up
```bash
sudo containerlab inspect -t topology.clab.yml
```
_TODO output_

## 2. BGP sessions (on each leaf and spine)
```
show network-instance default protocols bgp neighbor
```
Expect: 2 sessions per leaf and per spine, state established.
_TODO output_

## 3. Routes
```
show network-instance default route-table ipv4-unicast summary
```
Expect on leaf1: 10.12.0.0/24 learned via BGP (via spine1 and/or spine2).
_TODO output — note whether one or two next hops are installed_

## 4. Client to client
```bash
docker exec -it clab-srl-ebgp-client1 ping -c 5 10.12.0.10
docker exec -it clab-srl-ebgp-client1 traceroute 10.12.0.10
```
_TODO output_

## 5. Save configs (optional)
```bash
sudo containerlab save -t topology.clab.yml   # runs "tools system configuration save" on SR Linux nodes
```
