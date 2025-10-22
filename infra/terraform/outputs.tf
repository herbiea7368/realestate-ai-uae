output "backups_bucket_name" {
  description = "Name of the S3 bucket used for RealEstate AI backups."
  value       = aws_s3_bucket.backups.id
}

output "backups_bucket_arn" {
  description = "ARN of the backups S3 bucket."
  value       = aws_s3_bucket.backups.arn
}

output "ecs_cluster_name" {
  description = "ECS cluster name for the platform compute workloads."
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN for the ECS cluster that runs service workloads."
  value       = aws_ecs_cluster.main.arn
}
