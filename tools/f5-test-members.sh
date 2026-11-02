#!/bin/bash
# f5-test-members.sh — test pool members from the F5 itself, inside a route domain.
# For each member: TCP connect (OK / REFUSED / TIMEOUT), HTTP status for the same
# request the monitor sends, and the server certificate (CN + expiry).
#
# Usage (run in bash on the BIG-IP):
#   ./f5-test-members.sh -r <RD> -p <port> [-H <Host header>] [-m GET|POST|HEAD] [-u <URI>] [-s] <ip> [ip ...]
#   -s  plain HTTP instead of HTTPS
# Example:
#   ./f5-test-members.sh -r 10 -p 9026 -H 10.20.2.210 -m POST -u /de/customer/v1.0.0/1234/status/ 10.20.2.8 10.20.2.12

RD=0; PORT=443; HOSTHDR=""; METHOD=GET; URI=/; SCHEME=https; TO=5
while getopts "r:p:H:m:u:st:" o; do
  case $o in
    r) RD=$OPTARG ;; p) PORT=$OPTARG ;; H) HOSTHDR=$OPTARG ;; m) METHOD=$OPTARG ;;
    u) URI=$OPTARG ;; s) SCHEME=http ;; t) TO=$OPTARG ;;
    *) sed -n '2,12p' "$0"; exit 1 ;;
  esac
done
shift $((OPTIND - 1))
[ $# -eq 0 ] && { sed -n '2,12p' "$0"; exit 1; }
[[ $URI == /* ]] || { echo "WARNING: URI '$URI' does not start with '/' — fixing"; URI="/$URI"; }

printf '%-16s %-9s %-6s %s\n' MEMBER TCP HTTP CERT
for ip in "$@"; do
  # 1) TCP: bash /dev/tcp distinguishes refused (RST) from timeout (no answer) — no nc needed
  err=$(rdexec "$RD" timeout "$TO" bash -c "exec 3<>/dev/tcp/$ip/$PORT" 2>&1); rc=$?
  if [ $rc -eq 0 ]; then tcp=OK
  elif [ $rc -eq 124 ]; then tcp=TIMEOUT
  elif [[ $err == *refused* ]]; then tcp=REFUSED
  else tcp=ERR; fi

  http=-; cert=-
  if [ "$tcp" = OK ]; then
    # 2) HTTP status of the same request the monitor sends
    args=(-s -o /dev/null -w '%{http_code}' --connect-timeout "$TO" -m $((TO * 2)) -k -X "$METHOD")
    [ "$METHOD" = POST ] && args+=(-H 'Content-Length: 0')
    [ "$METHOD" = HEAD ] && args=(-s -o /dev/null -w '%{http_code}' --connect-timeout "$TO" -m $((TO * 2)) -k -I)
    [ -n "$HOSTHDR" ] && args+=(-H "Host: $HOSTHDR")
    http=$(rdexec "$RD" curl "${args[@]}" "$SCHEME://$ip:$PORT$URI" 2>/dev/null)
    # 3) certificate presented by the member
    if [ "$SCHEME" = https ]; then
      cert=$(echo | rdexec "$RD" timeout "$TO" openssl s_client -connect "$ip:$PORT" ${HOSTHDR:+-servername "$HOSTHDR"} 2>/dev/null \
        | openssl x509 -noout -subject -enddate 2>/dev/null \
        | sed -e 's/^subject=.*CN *= *\([^,/]*\).*/CN=\1/' -e 's/^notAfter=/until /' | paste -sd' ' -)
      [ -z "$cert" ] && cert="no TLS / handshake failed"
    fi
  fi
  printf '%-16s %-9s %-6s %s\n' "$ip" "$tcp" "$http" "$cert"
done
