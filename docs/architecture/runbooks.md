# Operational Runbooks

## Permit API Outage
1. Detect via health checks and Datadog SLO alert.
2. Switch API to degraded mode with cached responses (TTL 15 minutes).
3. Notify Compliance and Marketing via PagerDuty + Slack `#compliance-alerts`.
4. Pause listing publishes via feature flag in GrowthBook.
5. Investigate upstream DLD availability; escalate after 10 minutes.
6. Publish incident update every 30 minutes; complete postmortem within 48 hours.

## WhatsApp BSP Failure
1. Triggered when delivery acknowledgments stall for 2 consecutive minutes.
2. Fail over to secondary BSP; queue pending messages to SQS.
3. Suspend non-critical campaigns; show in-app banner warning agents.
4. Reconcile backlog post-recovery; document timeline in audit log.

## Vector Index Corruption
1. Switch search to read-only mode.
2. Restore latest S3 snapshot; rebuild embeddings for delta period.
3. Run golden set validation; reopen writes after diff < 1%.
4. File postmortem and review retraining pipeline safeguards.
