#!/bin/bash
set -e
kubectl rollout status deployment/realestate-ai-api -n $KUBE_NAMESPACE --timeout=120s
kubectl get pods -n $KUBE_NAMESPACE
curl -f http://$(kubectl get svc realestate-ai-api -n $KUBE_NAMESPACE -o jsonpath='{.spec.clusterIP}'):4001/healthz
echo "Validated: deployment operational"