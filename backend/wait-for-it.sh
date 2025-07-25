#!/usr/bin/env bash
#   Use this script to test if a given TCP host/port are available

# The MIT License (MIT)
#
# Copyright (c) 2016 Giles Hall
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# Original script: https://github.com/vishnubob/wait-for-it

set -e

TIMEOUT=15
QUIET=0
HOST=""
PORT=""

print_usage() {
    echo "Usage: $0 host:port [-- command args]"
}

wait_for() {
    for i in `seq $TIMEOUT` ; do
        nc -z "$HOST" "$PORT" > /dev/null 2>&1 && return 0
        sleep 1
    done
    return 1
}

while [ $# -gt 0 ]
do
    case "$1" in
        *:*)
            HOST=$(echo $1 | cut -d: -f1)
            PORT=$(echo $1 | cut -d: -f2)
            shift
            ;;
        --timeout=*)
            TIMEOUT="${1#*=}"
            shift
            ;;
        --quiet)
            QUIET=1
            shift
            ;;
        --)
            shift
            break
            ;;
        *)
            print_usage
            exit 1
            ;;
    esac

done

if [ "$HOST" = "" -o "$PORT" = "" ]; then
    print_usage
    exit 1
fi

if [ $QUIET -eq 0 ]; then
    echo "Waiting for $HOST:$PORT..."
fi

if wait_for; then
    if [ $QUIET -eq 0 ]; then
        echo "$HOST:$PORT is available!"
    fi
else
    echo "Timeout occurred after waiting $TIMEOUT seconds for $HOST:$PORT"
    exit 1
fi

exec "$@" 